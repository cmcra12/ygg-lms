"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assets, loans } from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { parseMoneyToCents } from "@/lib/format";
import type { ActionState } from "@/components/FormFrame";

export async function saveAsset(
  assetId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Description is required." };

  const valueRaw = String(formData.get("value") ?? "").trim();
  const valueExGstCents = valueRaw ? parseMoneyToCents(valueRaw) : null;
  if (valueRaw && valueExGstCents == null) return { error: "Value must be a valid amount." };

  const customerRaw = String(formData.get("customerId") ?? "");
  const loanRaw = String(formData.get("loanId") ?? "");
  const customerId = customerRaw ? Number(customerRaw) : null;
  const loanId = loanRaw ? Number(loanRaw) : null;

  if (loanId != null) {
    const [loan] = db.select().from(loans).where(eq(loans.id, loanId)).all();
    if (!loan) return { error: "Selected loan not found." };
    if (customerId != null && loan.customerId !== customerId) {
      return { error: "Selected loan belongs to a different customer." };
    }
    // Assets may only move to a different loan after the previous one finished.
    if (assetId != null) {
      const [current] = db.select().from(assets).where(eq(assets.id, assetId)).all();
      if (current?.loanId && current.loanId !== loanId) {
        const [previous] = db.select().from(loans).where(eq(loans.id, current.loanId)).all();
        if (previous && previous.status === "active") {
          return {
            error: `Asset is attached to active loan ${previous.contractNumber} — it can only be reassigned once that loan has finished.`,
          };
        }
      }
    }
  }

  const now = new Date().toISOString();
  const values = {
    description,
    category: String(formData.get("category") ?? "").trim() || null,
    vin: String(formData.get("vin") ?? "").trim().toUpperCase() || null,
    rego: String(formData.get("rego") ?? "").trim().toUpperCase() || null,
    serialNumber: String(formData.get("serialNumber") ?? "").trim() || null,
    valueExGstCents,
    status: String(formData.get("status") ?? "active"),
    customerId,
    loanId,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  let id = assetId;
  if (id == null) {
    const row = auditedInsert<{ id: number }>(user, assets, "asset", { ...values, createdAt: now });
    id = row.id;
  } else {
    auditedUpdate(user, assets, "asset", id, values);
  }
  revalidatePath("/assets");
  redirect(`/assets/${id}`);
}
