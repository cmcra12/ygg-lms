"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { externalParties } from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { cleanDigits, isValidAbn } from "@/lib/abn";
import type { ActionState } from "@/components/FormFrame";

export async function saveExternalParty(
  partyId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const abn = cleanDigits(String(formData.get("abn") ?? ""));
  const bsb = cleanDigits(String(formData.get("bsb") ?? ""));

  if (!name) return { error: "Name is required." };
  if (!["broker", "vendor", "referrer", "aggregator"].includes(type)) {
    return { error: "Invalid party type." };
  }
  if (abn && !isValidAbn(abn)) return { error: "ABN failed checksum validation." };
  if (bsb && bsb.length !== 6) return { error: "BSB must be 6 digits." };

  const aggregatorRaw = String(formData.get("aggregatorId") ?? "");
  const aggregatorId = aggregatorRaw ? Number(aggregatorRaw) : null;
  if (aggregatorId != null && aggregatorId === partyId) {
    return { error: "A party cannot be its own aggregator." };
  }

  const now = new Date().toISOString();
  const values = {
    type,
    name,
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    abn: abn || null,
    bsb: bsb || null,
    accountNumber: cleanDigits(String(formData.get("accountNumber") ?? "")) || null,
    accountName: String(formData.get("accountName") ?? "").trim() || null,
    accreditationStatus: String(formData.get("accreditationStatus") ?? "not_accredited"),
    paidBefore: formData.get("paidBefore") === "on",
    aggregatorId,
    status: formData.get("status") === "inactive" ? "inactive" : "active",
    notes: String(formData.get("notes") ?? "").trim() || null,
    updatedAt: now,
  };

  let id = partyId;
  if (id == null) {
    const row = await auditedInsert<{ id: number }>(user, externalParties, "external_party", {
      ...values,
      createdAt: now,
    });
    id = row.id;
  } else {
    await auditedUpdate(user, externalParties, "external_party", id, values);
  }
  revalidatePath("/external-parties");
  redirect(`/external-parties/${id}`);
}
