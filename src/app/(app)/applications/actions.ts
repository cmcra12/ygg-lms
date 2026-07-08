"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
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
import type { ActionState } from "@/components/FormFrame";

async function nextApplicationReference(): Promise<string> {
  const [latest] = await db.select().from(applications).orderBy(desc(applications.id)).limit(1);
  const year = todaySydney().slice(0, 4);
  return `APP-${year}-${String((latest?.id ?? 0) + 1).padStart(4, "0")}`;
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
    return { error: "Term must be a whole number of months (1–120)." };
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
    return { error: "Set the term on the application before converting." };
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
