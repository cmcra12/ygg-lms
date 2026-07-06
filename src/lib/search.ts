import { like, or, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, customerContacts, customers, loans } from "@/db/schema";

export type SearchResult = {
  kind: "customer" | "contact" | "asset" | "loan";
  title: string;
  subtitle: string;
  href: string;
};

// Global search across customer names/codes, contact names/mobiles/emails,
// VIN/rego/serial numbers and contract numbers.
export function globalSearch(term: string, limit = 10): SearchResult[] {
  const q = `%${term.trim()}%`;
  if (term.trim().length < 2) return [];

  const customerRows = db
    .select()
    .from(customers)
    .where(or(like(customers.name, q), like(customers.code, q), like(customers.abn, q)))
    .limit(limit)
    .all();

  const contactRows = db
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
    .all();

  const assetRows = db
    .select()
    .from(assets)
    .where(
      or(like(assets.vin, q), like(assets.rego, q), like(assets.serialNumber, q), like(assets.description, q)),
    )
    .limit(limit)
    .all();

  const loanRows = db
    .select({ loan: loans, customer: customers })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .where(like(loans.contractNumber, q))
    .limit(limit)
    .all();

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
      subtitle: `Loan for ${customer.name} · ${loan.status.replace("_", " ")}`,
      href: `/loans/${loan.id}`,
    })),
  ];
}
