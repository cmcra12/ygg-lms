import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  assets,
  customers,
  directDebitAuthorities,
  loanSchedules,
  loans,
  transactions,
} from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { PageHeader, Section, Badge, DetailList } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";
import { DataTable } from "@/components/DataTable";

const TXN_BADGE: Record<string, "green" | "red" | "amber" | "slate" | "blue"> = {
  payment: "green",
  charge: "blue",
  dishonour_fee: "red",
  upfront: "amber",
  adjustment: "slate",
};

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loanId = Number(id);
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.id, loan.customerId));
  const schedules = await db.select().from(loanSchedules).where(eq(loanSchedules.loanId, loanId));
  const loanAssets = await db.select().from(assets).where(eq(assets.loanId, loanId));
  const [ddr] = await db
    .select()
    .from(directDebitAuthorities)
    .where(eq(directDebitAuthorities.loanId, loanId))
    ;

  // Ledger, oldest first, with a running balance (inc GST).
  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.loanId, loanId))
    .orderBy(asc(transactions.date), asc(transactions.id))
    ;
  let running = 0;
  const ledger = txns.map((t) => {
    running += t.amountExGstCents;
    return { ...t, running };
  });
  const balance = running;

  return (
    <>
      <PageHeader
        title={loan.contractNumber}
        subtitle={
          <>
            <Link href={`/customers/${customer.id}`} className="text-ygg-700 underline">
              {customer.name}
            </Link>{" "}
            <Badge color={loan.status === "active" ? "green" : loan.status === "paid_out" ? "slate" : "red"}>
              {titleCase(loan.status)}
            </Badge>{" "}
            {loan.arrears && <Badge color="red">In arrears</Badge>}
          </>
        }
      />

      <Section title="Rental details">
        <DetailList
          items={[
            ["Start date", formatDate(loan.startDate)],
            ["End date", formatDate(loan.endDate)],
            ["Minimum return", `${loan.termMonths} months`],
            ["Payment frequency", titleCase(loan.paymentFrequency)],
            ["Balance (ex GST)", <strong key="b">{formatMoney(balance)}</strong>],
            [
              "Direct debit",
              ddr
                ? `${ddr.accountName} · BSB ${ddr.bsb} · Acc ${ddr.accountNumber} (${titleCase(ddr.status)}${ddr.zeptoReference ? `, Zepto ${ddr.zeptoReference}` : ""})`
                : "Not set up",
            ],
            ["Notes", loan.notes],
          ]}
        />
      </Section>

      <Section title="Recurring charges">
        <div className="card divide-y divide-slate-100">
          {schedules.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No recurring charges.</div>
          )}
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-40 shrink-0 font-medium">{s.code}</span>
              <span className="w-40 shrink-0 tabular-nums">
                {formatMoney(s.amountExGstCents)} ex GST
              </span>
              <span className="w-28 shrink-0 capitalize text-slate-600">{s.frequency}</span>
              <span className="text-slate-600">Next run {formatDate(s.nextRunDate)}</span>
              <span className="ml-auto">
                <Badge color={s.active ? "green" : "slate"}>{s.active ? "Active" : "Inactive"}</Badge>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Assets on this account">
        <div className="card divide-y divide-slate-100">
          {loanAssets.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">No assets linked.</div>
          )}
          {loanAssets.map((a) => (
            <Link
              key={a.id}
              href={`/assets/${a.id}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ygg-50"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{a.description}</span>
              <span className="w-40 shrink-0 text-slate-600">
                {[a.rego && `Rego ${a.rego}`, a.serialNumber && `S/N ${a.serialNumber}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="w-32 shrink-0 tabular-nums text-slate-600">
                {formatMoney(a.valueExGstCents)}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Ledger (read-only)">
        <DataTable
          filename={`ledger-${loan.contractNumber}`}
          columns={[
            { key: "date", header: "Date" },
            { key: "type", header: "Type" },
            { key: "description", header: "Description" },
            { key: "reference", header: "Reference" },
            { key: "source", header: "Source" },
            { key: "exGst", header: "Amount (ex GST)", align: "right" },
            { key: "gst", header: "GST (tracked)", align: "right" },
            { key: "running", header: "Balance (ex GST)", align: "right" },
          ]}
          rows={ledger.map((t) => ({
            cells: {
              date: { text: formatDate(t.date), sort: t.date },
              type: { text: titleCase(t.type), badge: TXN_BADGE[t.type] },
              description: t.description,
              reference: t.reference,
              source: titleCase(t.source),
              exGst: { text: formatMoney(t.amountExGstCents), sort: t.amountExGstCents },
              gst: { text: formatMoney(t.gstCents), sort: t.gstCents },
              running: { text: formatMoney(t.running), sort: t.running },
            },
          }))}
          emptyMessage="No transactions on this rental account."
        />
      </Section>

      <AuditTrail entityType="loan" entityId={loan.id} />
    </>
  );
}
