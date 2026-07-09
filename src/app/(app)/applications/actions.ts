"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  applicationApplicants,
  applicationAssets,
  applicationChecklistItems,
  applications,
  assets,
  customerContacts,
  customers,
  loans,
  ppsrEvents,
  ppsrRegistrations,
} from "@/db/schema";
import { auditedDelete, auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser, type SessionUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { parseMoneyToCents, todaySydney } from "@/lib/format";
import { DEFAULT_CHECKLIST } from "@/lib/checklist";
import { creditBureau, idVerification, infoAgent, ppsr } from "@/integrations";
import { openWorkflowAs } from "../workflowActions";
import type { ActionState } from "@/components/FormFrame";

async function nextApplicationReference(): Promise<string> {
  // Continue from the highest existing reference number (not the row id, which
  // jumps once bulk demo data with high explicit ids is loaded).
  const refs = await db.select({ reference: applications.reference }).from(applications);
  let max = 0;
  for (const { reference } of refs) {
    const match = /^APP-\d{4}-(\d+)$/.exec(reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  const year = todaySydney().slice(0, 4);
  return `APP-${year}-${String(max + 1).padStart(4, "0")}`;
}

function intOrNull(raw: FormDataEntryValue | null): number | null {
  const cleaned = String(raw ?? "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function textOrNull(raw: FormDataEntryValue | null): string | null {
  return String(raw ?? "").trim() || null;
}

function parsePercent(raw: string, label: string): { value: string | null; error?: string } {
  const cleaned = raw.replace(/%/g, "").trim();
  if (!cleaned) return { value: null };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 100) return { value: null, error: `${label} must be a number between 0 and 100.` };
  return { value: cleaned };
}

export async function saveApplication(
  applicationId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const customerId = Number(formData.get("customerId") || 0);
  if (!customerId) return { error: "Customer is required." };
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) return { error: "Customer not found." };

  const source = String(formData.get("source") ?? "direct");
  if (!["broker", "direct", "referrer", "vendor"].includes(source)) {
    return { error: "Invalid source." };
  }
  const status = String(formData.get("status") ?? "draft");
  if (!["draft", "in_progress", "approved", "declined", "withdrawn"].includes(status)) {
    return { error: "Invalid status." };
  }

  const dealRaw = String(formData.get("dealValue") ?? "").trim();
  const dealValueExGstCents = dealRaw ? parseMoneyToCents(dealRaw) : null;
  if (dealRaw && dealValueExGstCents == null) return { error: "Deal value must be a valid amount." };
  const brokerageRaw = String(formData.get("brokerage") ?? "").trim();
  const brokerageExGstCents = brokerageRaw ? parseMoneyToCents(brokerageRaw) : null;
  if (brokerageRaw && brokerageExGstCents == null) return { error: "Brokerage must be a valid amount." };

  // RR and ROI come from YGG's external quote tools — recorded, never calculated.
  const rr = parsePercent(String(formData.get("rentalRatePercent") ?? ""), "Rental rate");
  if (rr.error) return { error: rr.error };
  const roi = parsePercent(String(formData.get("roiPercent") ?? ""), "ROI");
  if (roi.error) return { error: roi.error };

  const termRaw = String(formData.get("termMonths") ?? "").trim();
  const termMonths = termRaw ? Number(termRaw) : null;
  if (termRaw && (!Number.isInteger(termMonths) || termMonths! <= 0 || termMonths! > 120)) {
    return { error: "Minimum return must be a whole number of months (1–120)." };
  }

  const brokerRaw = String(formData.get("brokerId") ?? "");
  const now = new Date().toISOString();
  const values = {
    customerId,
    status,
    source,
    brokerId: brokerRaw ? Number(brokerRaw) : null,
    ownerId: Number(formData.get("ownerId") || 0) || user.id,
    dealValueExGstCents,
    rentalRatePercent: rr.value,
    roiPercent: roi.value,
    termMonths,
    brokerageExGstCents,
    // Business information (YGG application form).
    tradingName: textOrNull(formData.get("tradingName")),
    entityType: textOrNull(formData.get("entityType")),
    trusteeType: textOrNull(formData.get("trusteeType")),
    trusteeName: textOrNull(formData.get("trusteeName")),
    yearsTrading: intOrNull(formData.get("yearsTrading")),
    natureOfBusiness: textOrNull(formData.get("natureOfBusiness")),
    businessPhone: textOrNull(formData.get("businessPhone")),
    businessAddressLine1: textOrNull(formData.get("businessAddressLine1")),
    businessSuburb: textOrNull(formData.get("businessSuburb")),
    businessState: textOrNull(formData.get("businessState")),
    businessPostcode: textOrNull(formData.get("businessPostcode")),
    premises: textOrNull(formData.get("premises")),
    employeesCount: intOrNull(formData.get("employeesCount")),
    machinesInFleet: intOrNull(formData.get("machinesInFleet")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  let id = applicationId;
  if (id == null) {
    const row = await auditedInsert<{ id: number }>(user, applications, "application", {
      ...values,
      reference: await nextApplicationReference(),
      createdAt: now,
    });
    id = row.id;
    for (const item of DEFAULT_CHECKLIST) {
      await auditedInsert(user, applicationChecklistItems, "application_checklist_item", {
        applicationId: id,
        key: item.key,
        label: item.label,
        status: "pending",
      });
    }
    // Every new application opens its Origination workflow automatically.
    await openWorkflowAs(user, "origination", "application", id);
  } else {
    const [existing] = await db.select().from(applications).where(eq(applications.id, id));
    if (!existing) return { error: "Application not found." };
    if (existing.status === "converted") {
      return { error: "This application has been converted to a loan and can no longer be edited." };
    }
    await auditedUpdate(user, applications, "application", id, values);
  }
  revalidatePath("/applications");
  redirect(`/applications/${id}`);
}

// --- Applicants (Applicant 1 / Applicant 2 on the application form) ---------

export async function saveApplicant(
  applicationId: number,
  applicantId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return { error: "Application not found." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  if (!firstName || !surname) return { error: "First name and surname are required." };

  const totalAssetsRaw = String(formData.get("totalAssets") ?? "").trim();
  const totalAssetsCents = totalAssetsRaw ? parseMoneyToCents(totalAssetsRaw) : null;
  if (totalAssetsRaw && totalAssetsCents == null) return { error: "Total assets must be a valid amount." };
  const totalLiabilitiesRaw = String(formData.get("totalLiabilities") ?? "").trim();
  const totalLiabilitiesCents = totalLiabilitiesRaw ? parseMoneyToCents(totalLiabilitiesRaw) : null;
  if (totalLiabilitiesRaw && totalLiabilitiesCents == null) {
    return { error: "Total liabilities must be a valid amount." };
  }

  const existing = await db
    .select()
    .from(applicationApplicants)
    .where(eq(applicationApplicants.applicationId, applicationId));
  if (applicantId == null && existing.length >= 2) {
    return { error: "The application form covers a maximum of two applicants." };
  }

  const now = new Date().toISOString();
  const values = {
    applicationId,
    position: applicantId == null ? (existing.some((a) => a.position === 1) ? 2 : 1) : undefined,
    firstName,
    middleName: textOrNull(formData.get("middleName")),
    surname,
    dateOfBirth: textOrNull(formData.get("dateOfBirth")),
    gender: textOrNull(formData.get("gender")),
    yearsIndustryExperience: intOrNull(formData.get("yearsIndustryExperience")),
    cityCountryOfBirth: textOrNull(formData.get("cityCountryOfBirth")),
    driversLicenceNo: textOrNull(formData.get("driversLicenceNo")),
    driversLicenceExpiry: textOrNull(formData.get("driversLicenceExpiry")),
    driversCardNo: textOrNull(formData.get("driversCardNo")),
    medicareNo: textOrNull(formData.get("medicareNo")),
    medicarePosition: textOrNull(formData.get("medicarePosition")),
    medicareExpiry: textOrNull(formData.get("medicareExpiry")),
    mobile: textOrNull(formData.get("mobile")),
    email: textOrNull(formData.get("email")),
    homeAddressLine1: textOrNull(formData.get("homeAddressLine1")),
    homeSuburb: textOrNull(formData.get("homeSuburb")),
    homeState: textOrNull(formData.get("homeState")),
    homePostcode: textOrNull(formData.get("homePostcode")),
    homeOwnership: textOrNull(formData.get("homeOwnership")),
    previousAddress: textOrNull(formData.get("previousAddress")),
    privacyAcknowledged: formData.get("privacyAcknowledged") === "on",
    assetsDetail: textOrNull(formData.get("assetsDetail")),
    liabilitiesDetail: textOrNull(formData.get("liabilitiesDetail")),
    totalAssetsCents,
    totalLiabilitiesCents,
    comments: textOrNull(formData.get("comments")),
    updatedAt: now,
  };

  if (applicantId == null) {
    await auditedInsert(user, applicationApplicants, "application_applicant", {
      ...values,
      createdAt: now,
    });
  } else {
    const { position: _ignored, ...updateValues } = values;
    await auditedUpdate(user, applicationApplicants, "application_applicant", applicantId, updateValues);
  }
  revalidatePath(`/applications/${applicationId}`);
  redirect(`/applications/${applicationId}?tab=applicants`);
}

export async function deleteApplicant(applicationId: number, applicantId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:delete");
  await auditedDelete(user, applicationApplicants, "application_applicant", applicantId);
  revalidatePath(`/applications/${applicationId}`);
}

// --- Assets on the application ---------------------------------------------

export async function addApplicationAsset(
  applicationId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return { error: "Application not found." };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Description is required." };
  const valueRaw = String(formData.get("value") ?? "").trim();
  const valueExGstCents = valueRaw ? parseMoneyToCents(valueRaw) : null;
  if (valueRaw && valueExGstCents == null) return { error: "Value must be a valid amount." };

  const now = new Date().toISOString();
  const asset = await auditedInsert<{ id: number }>(user, assets, "asset", {
    description,
    category: String(formData.get("category") ?? "").trim() || null,
    industry: String(formData.get("industry") ?? "").trim() || null,
    vin: String(formData.get("vin") ?? "").trim().toUpperCase() || null,
    rego: String(formData.get("rego") ?? "").trim().toUpperCase() || null,
    serialNumber: String(formData.get("serialNumber") ?? "").trim() || null,
    valueExGstCents,
    status: "active",
    customerId: application.customerId,
    loanId: null,
    createdAt: now,
    updatedAt: now,
  });
  await auditedInsert(user, applicationAssets, "application_asset", {
    applicationId,
    assetId: asset.id,
  });
  revalidatePath(`/applications/${applicationId}`);
  redirect(`/applications/${applicationId}`);
}

export async function removeApplicationAsset(applicationId: number, linkId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  // Removes the link only — the asset itself stays on the register.
  await auditedDelete(user, applicationAssets, "application_asset", linkId);
  revalidatePath(`/applications/${applicationId}`);
}

// --- Checklist ---------------------------------------------------------------

async function completeChecklistItem(
  user: SessionUser,
  applicationId: number,
  key: string,
  notes: string,
) {
  const [item] = await db
    .select()
    .from(applicationChecklistItems)
    .where(
      and(
        eq(applicationChecklistItems.applicationId, applicationId),
        eq(applicationChecklistItems.key, key),
      ),
    );
  if (!item) return;
  await auditedUpdate(user, applicationChecklistItems, "application_checklist_item", item.id, {
    status: "done",
    completedBy: user.id,
    completedAt: new Date().toISOString(),
    notes,
  });
}

export async function setChecklistStatus(
  applicationId: number,
  itemId: number,
  status: "pending" | "done" | "not_applicable",
): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  await auditedUpdate(user, applicationChecklistItems, "application_checklist_item", itemId, {
    status,
    completedBy: status === "done" ? user.id : null,
    completedAt: status === "done" ? new Date().toISOString() : null,
  });
  revalidatePath(`/applications/${applicationId}`);
}

// --- Stubbed integration runs -------------------------------------------------
// Each of these calls the mock driver today; swapping in the real API changes
// nothing here (see src/integrations). Manual fallback: mark the item done.

export async function runCreditCheck(applicationId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return;
  const [customer] = await db.select().from(customers).where(eq(customers.id, application.customerId));

  const result = await creditBureau.check({ name: customer.name, abn: customer.abn ?? undefined });

  const guarantors = await db
    .select()
    .from(customerContacts)
    .where(
      and(
        eq(customerContacts.customerId, application.customerId),
        eq(customerContacts.kind, "director_guarantor"),
      ),
    );
  for (const g of guarantors) {
    await auditedUpdate(user, customerContacts, "customer_contact", g.id, {
      creditCheckStatus: result.result === "clear" ? "clear" : "adverse",
      updatedAt: new Date().toISOString(),
    });
  }
  await completeChecklistItem(
    user,
    applicationId,
    "credit_check",
    `Bureau result: ${result.result}, score ${result.score} (stub)`,
  );
  revalidatePath(`/applications/${applicationId}`);
}

export async function runIdVerification(applicationId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return;

  const guarantors = await db
    .select()
    .from(customerContacts)
    .where(
      and(
        eq(customerContacts.customerId, application.customerId),
        eq(customerContacts.kind, "director_guarantor"),
      ),
    );
  for (const g of guarantors) {
    const result = await idVerification.verify({ name: g.name });
    await auditedUpdate(user, customerContacts, "customer_contact", g.id, {
      idVerificationStatus: result.result,
      updatedAt: new Date().toISOString(),
    });
  }
  await completeChecklistItem(
    user,
    applicationId,
    "id_matrix",
    guarantors.length === 0
      ? "No director guarantors recorded — verified n/a (stub)"
      : `${guarantors.length} director guarantor(s) verified (stub)`,
  );
  revalidatePath(`/applications/${applicationId}`);
}

export async function runInfoAgent(applicationId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return;
  const [customer] = await db.select().from(customers).where(eq(customers.id, application.customerId));

  const result = await infoAgent.companyLookup(customer.abn ?? "");
  await completeChecklistItem(
    user,
    applicationId,
    "info_agent",
    `Company status: ${result.status} (stub)`,
  );
  revalidatePath(`/applications/${applicationId}`);
}

export async function runPpsrSearch(applicationId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const links = await db
    .select({ asset: assets })
    .from(applicationAssets)
    .innerJoin(assets, eq(applicationAssets.assetId, assets.id))
    .where(eq(applicationAssets.applicationId, applicationId));

  const now = new Date().toISOString();
  for (const { asset } of links) {
    const result = await ppsr.search({
      vin: asset.vin ?? undefined,
      serialNumber: asset.serialNumber ?? undefined,
    });
    const existing = await db
      .select()
      .from(ppsrRegistrations)
      .where(eq(ppsrRegistrations.assetId, asset.id));
    if (existing.length === 0) {
      const registration = await auditedInsert<{ id: number }>(
        user,
        ppsrRegistrations,
        "ppsr_registration",
        {
          assetId: asset.id,
          kind: "pmsi",
          status: "searched",
          createdAt: now,
          updatedAt: now,
        },
      );
      await auditedInsert(user, ppsrEvents, "ppsr_event", {
        registrationId: registration.id,
        event: "searched",
        date: todaySydney(),
        notes:
          result.registrations.length === 0
            ? "No adverse registrations found (stub)"
            : `${result.registrations.length} existing registration(s) found (stub)`,
        createdBy: user.id,
      });
    }
  }
  await completeChecklistItem(
    user,
    applicationId,
    "ppsr_search",
    `${links.length} asset(s) searched (stub)`,
  );
  revalidatePath(`/applications/${applicationId}`);
}

// --- Convert an approved application into a loan account ----------------------

// Contract numbers run sequentially in the YGG51600, YGG51601, … series.
const CONTRACT_SERIES_START = 51599;

async function nextContractNumber(): Promise<string> {
  const rows = await db.select({ contractNumber: loans.contractNumber }).from(loans);
  const max = rows.reduce((m, r) => {
    const n = Number(r.contractNumber.replace(/\D/g, ""));
    return Number.isFinite(n) && n > m ? n : m;
  }, CONTRACT_SERIES_START);
  return `YGG${max + 1}`;
}

export async function convertApplication(
  applicationId: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return { error: "Application not found." };
  if (application.status !== "approved") {
    return { error: "Only approved applications can be converted to a loan account." };
  }
  if (!application.termMonths) {
    return { error: "Set the minimum return (months) on the application before converting." };
  }

  const links = await db
    .select({ asset: assets })
    .from(applicationAssets)
    .innerJoin(assets, eq(applicationAssets.assetId, assets.id))
    .where(eq(applicationAssets.applicationId, applicationId));
  if (links.length === 0) return { error: "Add at least one asset before converting." };

  // Assets can only move to a new loan once any previous loan has finished.
  const attachedLoanIds = links.map((l) => l.asset.loanId).filter((v): v is number => v != null);
  if (attachedLoanIds.length > 0) {
    const activeLoans = await db
      .select()
      .from(loans)
      .where(and(inArray(loans.id, attachedLoanIds), eq(loans.status, "active")));
    if (activeLoans.length > 0) {
      return {
        error: `Asset(s) still attached to active loan ${activeLoans[0].contractNumber} — they can only be reassigned once it has finished.`,
      };
    }
  }

  const startDate = String(formData.get("startDate") ?? "").trim() || todaySydney();
  const frequency = String(formData.get("paymentFrequency") ?? "monthly");
  if (!["weekly", "fortnightly", "monthly"].includes(frequency)) {
    return { error: "Invalid payment frequency." };
  }

  const now = new Date().toISOString();
  const loan = await auditedInsert<{ id: number; contractNumber: string }>(user, loans, "loan", {
    contractNumber: await nextContractNumber(),
    customerId: application.customerId,
    applicationId,
    startDate,
    endDate: null,
    termMonths: application.termMonths,
    paymentFrequency: frequency,
    status: "active",
    arrears: false,
    createdAt: now,
    updatedAt: now,
  });

  for (const { asset } of links) {
    await auditedUpdate(user, assets, "asset", asset.id, {
      customerId: application.customerId,
      loanId: loan.id,
      status: "active",
      updatedAt: now,
    });

    // Register the PMSI (stub driver today, real PPSR B2G later).
    const registered = await ppsr.register({ assetId: asset.id, kind: "pmsi" });
    const [existing] = await db
      .select()
      .from(ppsrRegistrations)
      .where(eq(ppsrRegistrations.assetId, asset.id))
      .orderBy(desc(ppsrRegistrations.id));
    const registration =
      existing && existing.status === "searched"
        ? await auditedUpdate<{ id: number }>(user, ppsrRegistrations, "ppsr_registration", existing.id, {
            registrationNumber: registered.registrationNumber,
            registeredDate: registered.registeredDate,
            expiryDate: registered.expiryDate,
            status: "registered",
            updatedAt: now,
          })
        : await auditedInsert<{ id: number }>(user, ppsrRegistrations, "ppsr_registration", {
            assetId: asset.id,
            registrationNumber: registered.registrationNumber,
            kind: "pmsi",
            registeredDate: registered.registeredDate,
            expiryDate: registered.expiryDate,
            status: "registered",
            createdAt: now,
            updatedAt: now,
          });
    await auditedInsert(user, ppsrEvents, "ppsr_event", {
      registrationId: registration.id,
      event: "registered",
      date: registered.registeredDate,
      notes: "PMSI registered at settlement (stub)",
      createdBy: user.id,
    });
  }

  await auditedUpdate(user, applications, "application", applicationId, {
    status: "converted",
    updatedAt: now,
  });

  revalidatePath("/applications");
  revalidatePath("/loans");
  redirect(`/accounts/${loan.id}`);
}
