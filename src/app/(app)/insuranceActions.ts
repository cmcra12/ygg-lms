"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customerContacts, customers, insurancePolicies } from "@/db/schema";
import { auditedUpdate } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { sendInsuranceExpiryEmail } from "@/lib/hubspot";

export type NotifyResult = { ok: boolean; message: string };

// Notify a client that their insurance is expiring: pull the client's details
// and send the HubSpot renewal-reminder template, then stamp the policy so the
// dashboard shows it was notified.
export async function notifyInsuranceExpiry(policyId: number): Promise<NotifyResult> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const [policy] = await db.select().from(insurancePolicies).where(eq(insurancePolicies.id, policyId));
  if (!policy) return { ok: false, message: "Policy not found." };

  const [customer] = await db.select().from(customers).where(eq(customers.id, policy.customerId));
  if (!customer) return { ok: false, message: "Client not found." };

  // Prefer a named contact (director guarantor first), else the company record.
  const contacts = await db
    .select()
    .from(customerContacts)
    .where(and(eq(customerContacts.customerId, customer.id)))
    .orderBy(asc(customerContacts.id));
  const preferred =
    contacts.find((c) => c.kind === "director_guarantor" && c.email) ??
    contacts.find((c) => c.email) ??
    null;

  const result = await sendInsuranceExpiryEmail({
    toEmail: preferred?.email ?? customer.email ?? null,
    contactName: preferred?.name ?? null,
    companyName: customer.name,
    insurer: policy.insurer,
    policyNumber: policy.policyNumber,
    expiryDate: formatDate(policy.expiryDate),
  });

  if (!result.ok) return { ok: false, message: result.message };

  await auditedUpdate(user, insurancePolicies, "insurance_policy", policy.id, {
    lastNotifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/");
  return { ok: true, message: result.message };
}
