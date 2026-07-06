"use server";

import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customerContacts, customers, insurancePolicies } from "@/db/schema";
import { auditedDelete, auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { cleanDigits, isValidAbn, isValidAcn } from "@/lib/abn";
import type { ActionState } from "@/components/FormFrame";

function nextCustomerCode(): string {
  const [latest] = db.select().from(customers).orderBy(desc(customers.id)).limit(1).all();
  const nextNumber = (latest?.id ?? 0) + 1001;
  return `C${nextNumber}`;
}

export async function saveCustomer(
  customerId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "company");
  const abn = cleanDigits(String(formData.get("abn") ?? ""));
  const acn = cleanDigits(String(formData.get("acn") ?? ""));

  if (!name) return { error: "Name is required." };
  if (type !== "individual" && type !== "company") return { error: "Invalid customer type." };
  if (type === "company" && !abn) return { error: "ABN is required for companies." };
  if (abn && !isValidAbn(abn)) return { error: "ABN failed checksum validation." };
  if (acn && !isValidAcn(acn)) return { error: "ACN failed checksum validation." };

  const now = new Date().toISOString();
  const values = {
    name,
    type,
    abn: abn || null,
    acn: acn || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
    addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
    suburb: String(formData.get("suburb") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    postcode: String(formData.get("postcode") ?? "").trim() || null,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  let id = customerId;
  if (id == null) {
    const row = auditedInsert<{ id: number }>(user, customers, "customer", {
      ...values,
      code: nextCustomerCode(),
      createdAt: now,
    });
    id = row.id;
  } else {
    auditedUpdate(user, customers, "customer", id, values);
  }
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

// --- Contacts -------------------------------------------------------------

export async function saveContact(
  customerId: number,
  contactId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "key");
  if (!name) return { error: "Contact name is required." };
  if (!["key", "authorised", "director_guarantor"].includes(kind)) {
    return { error: "Invalid contact kind." };
  }

  const isGuarantor = kind === "director_guarantor";
  const now = new Date().toISOString();
  const values = {
    customerId,
    kind,
    name,
    mobile: String(formData.get("mobile") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    // ID verification and credit checks only apply to director guarantors.
    idVerificationStatus: isGuarantor
      ? String(formData.get("idVerificationStatus") ?? "pending")
      : "not_required",
    creditCheckStatus: isGuarantor
      ? String(formData.get("creditCheckStatus") ?? "pending")
      : "not_required",
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  if (contactId == null) {
    auditedInsert(user, customerContacts, "customer_contact", { ...values, createdAt: now });
  } else {
    auditedUpdate(user, customerContacts, "customer_contact", contactId, values);
  }
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deleteContact(customerId: number, contactId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:delete");
  auditedDelete(user, customerContacts, "customer_contact", contactId);
  revalidatePath(`/customers/${customerId}`);
}

// --- Insurance ------------------------------------------------------------

export async function savePolicy(
  customerId: number,
  policyId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const insurer = String(formData.get("insurer") ?? "").trim();
  const policyNumber = String(formData.get("policyNumber") ?? "").trim();
  const expiryDate = String(formData.get("expiryDate") ?? "").trim();
  if (!insurer || !policyNumber || !expiryDate) {
    return { error: "Insurer, policy number and expiry date are required." };
  }

  const now = new Date().toISOString();
  const values = {
    customerId,
    insurer,
    policyNumber,
    expiryDate,
    status: String(formData.get("status") ?? "current"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  if (policyId == null) {
    auditedInsert(user, insurancePolicies, "insurance_policy", { ...values, createdAt: now });
  } else {
    auditedUpdate(user, insurancePolicies, "insurance_policy", policyId, values);
  }
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

export async function deletePolicy(customerId: number, policyId: number): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:delete");
  auditedDelete(user, insurancePolicies, "insurance_policy", policyId);
  revalidatePath(`/customers/${customerId}`);
}
