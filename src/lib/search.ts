import { like, or, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, assets, customerContacts, customers, loans } from "@/db/schema";

export type SearchResult = {
  kind: "customer" | "contact" | "asset" | "loan" | "application";
  title: string;
  subtitle: string;
  href: string;
};

// Global search across customer names/codes, contact names/mobiles/emails,
// VIN/rego/serial numbers and contract numbers.
export async function globalSearch(term: string, limit = 10): Promise<SearchResult[]> {
  const q = `%${term.trim()}%`;
  if (term.trim().length < 2) return [];

  const customerRows = await db
    .select()
    .from(customers)
    .where(or(like(customers.name, q), like(customers.code, q), like(customers.abn, q)))
    .limit(limit)
    ;

  const contactRows = await db
    .select({ contact: customerContacts, customer: customers })
    .from(customerContacts)
    .innerJoin(customers, eq(customerContacts.customerId, customers.id))
    .where(
      or(
        like(customerContacts.name, q),
        like(customerContacts.mobile, q),
        like(customerContacts.email, q),
      ),
    )
    .limit(limit)
    ;

  const assetRows = await db
    .select()
    .from(assets)
    .where(
      or(like(assets.vin, q), like(assets.rego, q), like(assets.serialNumber, q), like(assets.description, q)),
    )
    .limit(limit)
    ;

  const loanRows = await db
    .select({ loan: loans, customer: customers })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .where(like(loans.contractNumber, q))
    .limit(limit)
    ;

  const applicationRows = await db
    .select({ application: applications, customer: customers })
    .from(applications)
    .innerJoin(customers, eq(applications.customerId, customers.id))
    .where(like(applications.reference, q))
    .limit(limit);

  return [
    ...customerRows.map((c) => ({
      kind: "customer" as const,
      title: `${c.code} — ${c.name}`,
      subtitle: c.type === "company" ? `Company · ABN ${c.abn ?? "—"}` : "Individual",
      href: `/customers/${c.id}`,
    })),
    ...contactRows.map(({ contact, customer }) => ({
      kind: "contact" as const,
      title: contact.name,
      subtitle: `${contact.kind === "director_guarantor" ? "Director Guarantor" : contact.kind === "key" ? "Key contact" : "Authorised contact"} at ${customer.name} · ${contact.mobile ?? contact.email ?? ""}`,
      href: `/customers/${customer.id}`,
    })),
    ...assetRows.map((a) => ({
      kind: "asset" as const,
      title: a.description,
      subtitle: [a.vin && `VIN ${a.vin}`, a.rego && `Rego ${a.rego}`, a.serialNumber && `S/N ${a.serialNumber}`]
        .filter(Boolean)
        .join(" · "),
      href: `/assets/${a.id}`,
    })),
    ...loanRows.map(({ loan, customer }) => ({
      kind: "loan" as const,
      title: loan.contractNumber,
      subtitle: `Account for ${customer.name} · ${loan.status.replace("_", " ")}`,
      href: `/accounts/${loan.id}`,
    })),
    ...applicationRows.map(({ application, customer }) => ({
      kind: "application" as const,
      title: application.reference,
      subtitle: `Application for ${customer.name} · ${application.status.replace("_", " ")}`,
      href: `/applications/${application.id}`,
    })),
  ];
}
