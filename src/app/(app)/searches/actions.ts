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

// Control fields that describe the request rather than being search inputs.
const CONTROL_FIELDS = new Set(["type", "customerId", "notes", "subtype"]);

// A short human summary of what was searched, from the tailored fields.
function composeSubject(type: SearchType, subtype: string, p: Record<string, string>): string {
  const nameOf = (first?: string, last?: string) => [first, last].filter(Boolean).join(" ").trim();
  const withState = (s: string) => (p.state ? `${s} (${p.state})` : s);
  switch (type) {
    case "equifax_title":
      switch (subtype) {
        case "name":
          return withState(p.company || nameOf(p.firstName, p.surname));
        case "title":
          return withState(`Title ${p.titleReference ?? ""}`.trim());
        case "address":
          return withState(
            [p.unit, p.streetNumber, p.streetName, p.suburb, p.postcode].filter(Boolean).join(" "),
          );
        case "lot_plan":
          return withState(`Lot ${p.lot ?? ""} Plan ${p.plan ?? ""}`.trim());
        case "document":
          return withState([p.documentType, p.documentNumber].filter(Boolean).join(" "));
      }
      return withState("Title search");
    case "equifax_name":
      return nameOf(p.givenName, [p.middleName, p.surname].filter(Boolean).join(" "));
    case "equifax_credit":
      return subtype === "company" ? p.companyName ?? "" : nameOf(p.firstName, p.surname);
    case "court":
      return subtype === "company" ? withState(p.companyCaseTitle ?? "") : withState(nameOf(p.givenName, p.surname));
    case "ppsr":
      if (p.serialNumber) return p.serialNumber;
      if (p.registrationNumber) return p.registrationNumber;
      if (p.organisationName) return p.organisationName;
      if (p.grantorSurname || p.grantorGivenName) return nameOf(p.grantorGivenName, p.grantorSurname);
      return SEARCH_TYPES.ppsr.label;
  }
}

async function runProvider(
  type: SearchType,
  subject: string,
): Promise<{ result: string; reference: string }> {
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
  const subtype = String(formData.get("subtype") ?? "").trim() || null;

  // Collect the tailored fields into a params object (skip control + empties).
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (CONTROL_FIELDS.has(key)) continue;
    const v = String(value).trim();
    if (v) params[key] = v;
  }

  const subject = composeSubject(type, subtype ?? "", params).trim();
  if (!subject) return { error: "Enter the search details." };

  const customerRaw = String(formData.get("customerId") ?? "");
  const customerId = customerRaw ? Number(customerRaw) : null;
  if (customerId != null) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer) return { error: "Customer not found." };
  }

  const { result, reference } = await runProvider(type, subject);
  await auditedInsert(user, searches, "search", {
    type,
    subtype,
    customerId,
    subject,
    params: Object.keys(params).length > 0 ? JSON.stringify(params) : null,
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
