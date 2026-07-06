import Link from "next/link";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { assets, customers, insurancePolicies, loans, transactions } from "@/db/schema";
import { formatDate, formatMoney, todaySydney } from "@/lib/format";
import { PageHeader, Section, Badge } from "@/components/ui";

function StatCard({ label, value, href, alert }: { label: string; value: string; href: string; alert?: boolean }) {
  return (
    <Link href={href} className="card block p-4 hover:border-amber-400">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${alert ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const count = (q: { all: () => unknown[] }) => q.all().length;

  const activeLoans = count(db.select({ id: loans.id }).from(loans).where(eq(loans.status, "active")));
  const arrearsLoans = count(
    db.select({ id: loans.id }).from(loans).where(and(eq(loans.status, "active"), eq(loans.arrears, true))),
  );
  const activeCustomers = count(
    db.select({ id: customers.id }).from(customers).where(eq(customers.status, "active")),
  );
  const activeAssets = count(db.select({ id: assets.id }).from(assets).where(eq(assets.status, "active")));

  const [portfolio] = db
    .select({ total: sql<number>`coalesce(sum(${assets.valueExGstCents}), 0)` })
    .from(assets)
    .where(eq(assets.status, "active"))
    .all();

  const today = todaySydney();
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const expiringPolicies = db
    .select({ policy: insurancePolicies, customer: customers })
    .from(insurancePolicies)
    .innerJoin(customers, eq(insurancePolicies.customerId, customers.id))
    .where(
      and(
        eq(insurancePolicies.status, "current"),
        gte(insurancePolicies.expiryDate, today),
        lte(insurancePolicies.expiryDate, in60),
      ),
    )
    .orderBy(insurancePolicies.expiryDate)
    .all();

  const recent = db
    .select({ txn: transactions, loan: loans, customer: customers })
    .from(transactions)
    .innerJoin(loans, eq(transactions.loanId, loans.id))
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(10)
    .all();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Portfolio snapshot" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active loans" value={String(activeLoans)} href="/loans" />
        <StatCard label="In arrears" value={String(arrearsLoans)} href="/loans" alert={arrearsLoans > 0} />
        <StatCard label="Active customers" value={String(activeCustomers)} href="/customers" />
        <StatCard label="Active assets" value={String(activeAssets)} href="/assets" />
        <StatCard label="Asset value (ex GST)" value={formatMoney(portfolio?.total ?? 0)} href="/assets" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recent transactions">
          <div className="card divide-y divide-slate-100">
            {recent.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No transactions yet.</div>
            )}
            {recent.map(({ txn, loan, customer }) => (
              <Link
                key={txn.id}
                href={`/loans/${loan.id}`}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-amber-50"
              >
                <span className="w-24 shrink-0 tabular-nums text-slate-500">{formatDate(txn.date)}</span>
                <span className="w-32 shrink-0 font-medium">{loan.contractNumber}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">
                  {customer.name} · {txn.description ?? txn.type.replace("_", " ")}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${txn.amountExGstCents + txn.gstCents < 0 ? "text-emerald-700" : ""}`}
                >
                  {formatMoney(txn.amountExGstCents + txn.gstCents)}
                </span>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Insurance expiring in 60 days">
          <div className="card divide-y divide-slate-100">
            {expiringPolicies.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Nothing expiring in the next 60 days.
              </div>
            )}
            {expiringPolicies.map(({ policy, customer }) => (
              <Link
                key={policy.id}
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-amber-50"
              >
                <span className="w-24 shrink-0 tabular-nums text-slate-500">
                  {formatDate(policy.expiryDate)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {customer.name} · {policy.insurer} {policy.policyNumber}
                </span>
                <Badge color="amber">expiring</Badge>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
