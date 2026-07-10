import Link from "next/link";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, assets, customers, insurancePolicies, loans, transactions } from "@/db/schema";
import { formatDate, formatMoney, formatMoneyCompact, todaySydney } from "@/lib/format";
import { PageHeader, Section, Badge } from "@/components/ui";
import { NotifyInsuranceButton } from "@/components/NotifyInsuranceButton";

function StatCard({
  label,
  value,
  href,
  alert,
  sub,
}: {
  label: string;
  value: string;
  href: string;
  alert?: boolean;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="card block border-t-2 border-t-ygg-400 p-4 transition-shadow hover:shadow-md"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums 2xl:text-2xl ${alert ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500 tabular-nums">{sub}</div>}
    </Link>
  );
}

export default async function DashboardPage() {
  // Accounts by status, in one grouped query.
  const statusRows = await db
    .select({ status: loans.status, count: sql<number>`count(*)::int` })
    .from(loans)
    .groupBy(loans.status);
  const byStatus = new Map(statusRows.map((r) => [r.status, r.count]));
  const activeLoans = byStatus.get("active") ?? 0;
  const paidOutLoans = byStatus.get("paid_out") ?? 0;
  const writtenOffLoans = byStatus.get("written_off") ?? 0;
  const totalLoans = activeLoans + paidOutLoans + writtenOffLoans;
  const arrearsLoans = (
    await db.select({ id: loans.id }).from(loans).where(and(eq(loans.status, "active"), eq(loans.arrears, true)))
  ).length;
  const pctOfTotal = (n: number) => (totalLoans > 0 ? `${Math.round((n / totalLoans) * 100)}% of total` : "—");

  const activeCustomers = (
    await db.select({ id: customers.id }).from(customers).where(eq(customers.status, "active"))
  ).length;
  const activeAssets = (await db.select({ id: assets.id }).from(assets).where(eq(assets.status, "active"))).length;
  const openApplications = (
    await db
      .select({ id: applications.id })
      .from(applications)
      .where(inArray(applications.status, ["draft", "in_progress", "approved"]))
  ).length;

  const [portfolio] = await db
    // sum() over integers is bigint in Postgres — cast to float8 so the driver returns a number without overflowing int4 on a large book
    .select({ total: sql<number>`coalesce(sum(${assets.valueExGstCents}), 0)::float8` })
    .from(assets)
    .where(eq(assets.status, "active"))
    ;

  const today = todaySydney();
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const expiringPolicies = await db
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
    .limit(16);

  const recent = await db
    .select({ txn: transactions, loan: loans, customer: customers })
    .from(transactions)
    .innerJoin(loans, eq(transactions.loanId, loans.id))
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(10)
    ;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Portfolio snapshot" />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total accounts" value={String(totalLoans)} href="/accounts" />
        <StatCard label="Open applications" value={String(openApplications)} href="/applications" />
        <StatCard label="Active customers" value={String(activeCustomers)} href="/customers" />
        <StatCard label="Active assets" value={String(activeAssets)} href="/assets" />
        <StatCard label="Asset value (ex GST)" value={formatMoneyCompact(portfolio?.total ?? 0)} href="/assets" />
      </div>

      <div className="mb-6">
        <Section title="Accounts breakdown">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Active" value={String(activeLoans)} sub={pctOfTotal(activeLoans)} href="/accounts" />
            <StatCard
              label="In arrears"
              value={String(arrearsLoans)}
              sub={activeLoans > 0 ? `${Math.round((arrearsLoans / activeLoans) * 100)}% of active` : "—"}
              href="/collections"
              alert={arrearsLoans > 0}
            />
            <StatCard label="Paid out" value={String(paidOutLoans)} sub={pctOfTotal(paidOutLoans)} href="/accounts" />
            <StatCard
              label="Written off"
              value={String(writtenOffLoans)}
              sub={pctOfTotal(writtenOffLoans)}
              href="/accounts"
            />
          </div>
        </Section>
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
                href={`/accounts/${loan.id}`}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-ygg-50"
              >
                <span className="w-24 shrink-0 tabular-nums text-slate-500">{formatDate(txn.date)}</span>
                <span className="w-32 shrink-0 font-medium">{loan.contractNumber}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">
                  {customer.name} · {txn.description ?? txn.type.replace("_", " ")}
                </span>
                <span
                  className={`shrink-0 tabular-nums ${txn.amountExGstCents < 0 ? "text-emerald-700" : ""}`}
                >
                  {formatMoney(txn.amountExGstCents)}
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
              <div key={policy.id} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-ygg-50">
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="w-24 shrink-0 tabular-nums text-slate-500">
                    {formatDate(policy.expiryDate)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {customer.name} · {policy.insurer} {policy.policyNumber}
                  </span>
                  <Badge color="amber">expiring</Badge>
                </Link>
                <NotifyInsuranceButton policyId={policy.id} lastNotifiedAt={policy.lastNotifiedAt} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
