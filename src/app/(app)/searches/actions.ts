"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers, searches } from "@/db/schema";
import { auditedInsert } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { SEARCH_TYPES, type SearchType } from "@/lib/searchTypes";
import { creditBureau, ppsr } from "@/integrations";
import type { ActionState } from "@/components/FormFrame";

function providerReference(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 900000) + 100000}`;
}

// Runs the search against the stub provider for its type and saves the result
// against the customer. Real PPSR/Equifax/court APIs replace the stub branches
// via src/integrations without changing this screen.
async function runProvider(type: SearchType, subject: string): Promise<{ result: string; reference: string }> {
  switch (type) {
    case "ppsr": {
      const response = await ppsr.search({ serialNumber: subject });
      return {
        result:
          response.registrations.length === 0
            ? "No adverse registrations found (stub)"
            : `${response.registrations.length} existing registration(s) found (stub)`,
        reference: providerReference("PPSR"),
      };
    }
    case "equifax_credit": {
      const response = await creditBureau.check({ name: subject });
      return {
        result: `Score ${response.score} — ${response.result} (stub)`,
        reference: providerReference("EFX-C"),
      };
    }
    case "equifax_title":
      return {
        result: "Title search complete — ownership and encumbrance summary returned (stub)",
        reference: providerReference("EFX-T"),
      };
    case "equifax_name":
      return {
        result: "Name browse complete — no adverse matches located (stub)",
        reference: providerReference("EFX-N"),
      };
    case "court":
      return {
        result: "No court records located (stub)",
        reference: providerReference("CDS"),
      };
  }
}

export async function runSearch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const type = String(formData.get("type") ?? "") as SearchType;
  if (!SEARCH_TYPES[type]) return { error: "Choose a search type." };

  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { error: `${SEARCH_TYPES[type].subjectLabel} is required.` };

  const customerRaw = String(formData.get("customerId") ?? "");
  const customerId = customerRaw ? Number(customerRaw) : null;
  if (customerId != null) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) return { error: "Customer not found." };
  }

  const { result, reference } = await runProvider(type, subject);
  await auditedInsert(user, searches, "search", {
    type,
    customerId,
    subject,
    result,
    reference,
    notes: String(formData.get("notes") ?? "").trim() || null,
    runBy: user.id,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/searches");
  if (customerId != null) revalidatePath(`/customers/${customerId}`);
  redirect(customerId != null ? `/customers/${customerId}` : "/searches");
}
