import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, customerContacts, customers, insurancePolicies, loans, searches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatAbn, formatAcn } from "@/lib/abn";
import { formatDate, formatDateTime, formatMoney, titleCase, todaySydney } from "@/lib/format";
import { SEARCH_TYPES } from "@/lib/searchTypes";
import { PageHeader, Section, Badge, DetailList, LinkButton } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteContact, deletePolicy } from "../actions";

const CONTACT_KIND: Record<string, string> = {
  key: "Key contact",
  authorised: "Authorised contact",
  director_guarantor: "Director Guarantor",
};

const CHECK_BADGE: Record<string, "green" | "red" | "amber" | "slate"> = {
  verified: "green",
  clear: "green",
  failed: "red",
  adverse: "red",
  pending: "amber",
  not_required: "slate",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  const contacts = await db
    .select()
    .from(customerContacts)
    .where(eq(customerContacts.customerId, customerId))
    ;
  const policies = await db
    .select()
    .from(insurancePolicies)
    .where(eq(insurancePolicies.customerId, customerId))
    ;
  const customerLoans = await db.select().from(loans).where(eq(loans.customerId, customerId));
  const customerAssets = await db.select().from(assets).where(eq(assets.customerId, customerId));
  const customerSearches = await db
    .select()
    .from(searches)
    .where(eq(searches.customerId, customerId))
    .orderBy(desc(searches.id));

  const canDelete = can(user, "records:delete");
  const today = todaySydney();

  return (
    <>
      <PageHeader
        title={`${customer.code} — ${customer.name}`}
        subtitle={
          <>
            {titleCase(customer.type)}{" "}
            <Badge color={customer.status === "active" ? "green" : "slate"}>
              {titleCase(customer.status)}
            </Badge>
          </>
        }
        actions={
          <>
            <LinkButton href={`/customers/${customer.id}/payments`}>Payment history</LinkButton>
            <LinkButton href={`/customers/${customer.id}/edit`} variant="primary">
              Edit
            </LinkButton>
          </>
        }
      />

      <Section title="Details">
        <DetailList
          items={[
            ["ABN", customer.abn ? formatAbn(customer.abn) : "—"],
            ["ACN", customer.acn ? formatAcn(customer.acn) : "—"],
            ["Email", customer.email],
            ["Phone", customer.phone],
            [
              "Address",
              [customer.addressLine1, customer.addressLine2, customer.suburb, customer.state, customer.postcode]
                .filter(Boolean)
                .join(", ") || "—",
            ],
            ["Notes", customer.notes],
          ]}
        />
      </Section>

      <Section
        title="Contacts"
        actions={<LinkButton href={`/customers/${customer.id}/contacts/new`}>Add contact</LinkButton>}
      >
        <div className="card divide-y divide-slate-100">
          {contacts.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No contacts recorded.</div>
          )}
          {contacts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-44 shrink-0 font-medium">{c.name}</span>
              <span className="w-40 shrink-0">
                <Badge color={c.kind === "director_guarantor" ? "amber" : "blue"}>
                  {CONTACT_KIND[c.kind]}
                </Badge>
              </span>
              <span className="w-32 shrink-0 text-slate-600">{c.mobile ?? "—"}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{c.email ?? "—"}</span>
              {c.kind === "director_guarantor" && (
                <span className="flex shrink-0 gap-2 text-xs">
                  <Badge color={CHECK_BADGE[c.idVerificationStatus]}>
                    ID: {titleCase(c.idVerificationStatus)}
                  </Badge>
                  <Badge color={CHECK_BADGE[c.creditCheckStatus]}>
                    Credit: {titleCase(c.creditCheckStatus)}
                  </Badge>
                </span>
              )}
              <span className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/customers/${customer.id}/contacts/${c.id}/edit`}
                  className="text-xs text-ygg-700 underline"
                >
                  Edit
                </Link>
                {canDelete && (
                  <DeleteButton
                    action={deleteContact.bind(null, customer.id, c.id)}
                    confirmMessage={`Delete contact ${c.name}?`}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Insurance"
        actions={<LinkButton href={`/customers/${customer.id}/insurance/new`}>Add policy</LinkButton>}
      >
        <div className="card divide-y divide-slate-100">
          {policies.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No policies recorded.</div>
          )}
          {policies.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-44 shrink-0 font-medium">{p.insurer}</span>
              <span className="w-36 shrink-0 text-slate-600">{p.policyNumber}</span>
              <span className="w-40 shrink-0 text-slate-600">
                Expires {formatDate(p.expiryDate)}
              </span>
              <span className="shrink-0">
                <Badge
                  color={p.status !== "current" ? "slate" : p.expiryDate < today ? "red" : "green"}
                >
                  {p.status === "current" && p.expiryDate < today ? "Expired" : titleCase(p.status)}
                </Badge>
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-500">{p.notes}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/customers/${customer.id}/insurance/${p.id}/edit`}
                  className="text-xs text-ygg-700 underline"
                >
                  Edit
                </Link>
                {canDelete && (
                  <DeleteButton
                    action={deletePolicy.bind(null, customer.id, p.id)}
                    confirmMessage={`Delete policy ${p.policyNumber}?`}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Accounts">
        <div className="card divide-y divide-slate-100">
          {customerLoans.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No accounts.</div>
          )}
          {customerLoans.map((l) => (
            <Link
              key={l.id}
              href={`/accounts/${l.id}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ygg-50"
            >
              <span className="w-32 shrink-0 font-medium">{l.contractNumber}</span>
              <span className="w-40 shrink-0 text-slate-600">
                {formatDate(l.startDate)} · {l.termMonths} mths
              </span>
              <span className="w-28 shrink-0 capitalize text-slate-600">{l.paymentFrequency}</span>
              <span className="shrink-0">
                <Badge color={l.status === "active" ? "green" : l.status === "paid_out" ? "slate" : "red"}>
                  {titleCase(l.status)}
                </Badge>
              </span>
              {l.arrears && <Badge color="red">Arrears</Badge>}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Assets">
        <div className="card divide-y divide-slate-100">
          {customerAssets.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No assets linked.</div>
          )}
          {customerAssets.map((a) => (
            <Link
              key={a.id}
              href={`/assets/${a.id}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ygg-50"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{a.description}</span>
              <span className="w-32 shrink-0 text-slate-600">{a.rego ? `Rego ${a.rego}` : ""}</span>
              <span className="w-32 shrink-0 tabular-nums text-slate-600">
                {formatMoney(a.valueExGstCents)}
              </span>
              <Badge color={a.status === "active" ? "green" : a.status === "sold" ? "amber" : "slate"}>
                {titleCase(a.status)}
              </Badge>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Search history"
        actions={
          <LinkButton href={`/searches/new?customerId=${customer.id}`}>New search</LinkButton>
        }
      >
        <div className="card divide-y divide-slate-100">
          {customerSearches.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No searches run for this customer yet.
            </div>
          )}
          {customerSearches.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-40 shrink-0 tabular-nums text-slate-500">
                {formatDateTime(s.createdAt)}
              </span>
              <span className="w-60 shrink-0">
                <Badge color="blue">{SEARCH_TYPES[s.type].label}</Badge>
              </span>
              <span className="w-56 shrink-0 truncate font-medium">{s.subject}</span>
              <span className="min-w-0 flex-1 truncate text-slate-500">
                {s.result}
                {s.reference ? ` · ${s.reference}` : ""}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <AuditTrail entityType="customer" entityId={customer.id} />
    </>
  );
}
