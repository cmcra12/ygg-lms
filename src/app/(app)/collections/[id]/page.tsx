import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans, transactions, users } from "@/db/schema";
import { formatDate, formatMoney, titleCase, todaySydney } from "@/lib/format";
import { computeArrears } from "@/lib/arrears";
import { ACCOUNT_TEMPLATES } from "@/lib/workflows";
import { PageHeader, Section, Badge } from "@/components/ui";
import { WorkflowBoard } from "@/components/WorkflowBoard";
import { Comments } from "@/components/Comments";
import { loadWorkflows } from "../../workflowActions";
import { loadComments } from "../../commentsActions";

const TABS = [
  { key: "workflow", label: "Workflow" },
  { key: "comments", label: "Comments" },
] as const;

// Account-level workflows (collections, payout, returns), finPOWER-style.
export default async function CollectionsAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wf?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { wf, tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "workflow";
  const loanId = Number(id);
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) notFound();
  const [customer] = await db.select().from(customers).where(eq(customers.id, loan.customerId));

  const ledger = await db.select().from(transactions).where(eq(transactions.loanId, loanId));
  const balance = ledger.reduce((s, t) => s + t.amountExGstCents, 0);
  const arrears = computeArrears(ledger, todaySydney());

  const entries = await loadWorkflows("account", loanId);
  const userNames = new Map((await db.select().from(users)).map((u) => [u.id, u.name]));
  const comments = await loadComments("account", loanId);
  const tabHref = (key: string) => `/collections/${loanId}?tab=${key}`;

  return (
    <>
      <PageHeader
        title={`${loan.contractNumber}: ${customer.name.toUpperCase()}`}
        subtitle={
          <>
            <Link href={`/accounts/${loan.id}`} className="text-ygg-700 underline">
              View account ledger
            </Link>{" "}
            <Badge color={loan.status === "active" ? "green" : "slate"}>{titleCase(loan.status)}</Badge>{" "}
            {loan.arrears && <Badge color="red">In arrears</Badge>}
          </>
        }
      />

      {/* finPOWER-style tab strip */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-300">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border border-b-0 border-slate-300 bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.key === "comments" && comments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-ygg-400 px-1.5 text-[10px] font-bold text-slate-900">
                {comments.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {tab === "comments" && (
        <Comments
          entityType="account"
          entityId={loanId}
          comments={comments}
          revalidate={`/collections/${loanId}`}
        />
      )}

      {tab === "workflow" && (
      <>
      <div className="mb-6">
        <Section title="Arrears breakdown">
          <div className="card p-4">
            {arrears.missed.length === 0 ? (
              <p className="text-sm text-slate-500">
                No missed invoices — this account is up to date.
              </p>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Days since first missed invoice
                    </div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-red-600">
                      {arrears.daysSinceFirstMissed} days
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      since {formatDate(arrears.firstMissedDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Missed invoices
                    </div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                      {arrears.missed.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total outstanding (ex GST)
                    </div>
                    <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                      {formatMoney(arrears.outstandingExGstCents)}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3 font-semibold">Date</th>
                        <th className="py-2 pr-3 font-semibold">Invoice</th>
                        <th className="py-2 pr-3 font-semibold">Reference</th>
                        <th className="py-2 pr-3 text-right font-semibold">Amount (ex GST)</th>
                        <th className="py-2 pr-3 text-right font-semibold">Outstanding (ex GST)</th>
                        <th className="py-2 pr-3 text-right font-semibold">Days overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {arrears.missed.map((inv, i) => (
                        <tr key={`${inv.reference}-${i}`}>
                          <td className="py-2 pr-3 tabular-nums text-slate-500">{formatDate(inv.date)}</td>
                          <td className="py-2 pr-3">{inv.description ?? "Charge"}</td>
                          <td className="py-2 pr-3 text-slate-500">{inv.reference ?? "—"}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {formatMoney(inv.amountExGstCents)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums font-medium text-red-600">
                            {formatMoney(inv.outstandingExGstCents)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{inv.daysOverdue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Section>
      </div>

      <WorkflowBoard
        entries={entries}
        selectedId={wf ? Number(wf) : undefined}
        makeHref={(wfId) => `/collections/${loan.id}?tab=workflow&wf=${wfId}`}
        revalidate={`/collections/${loan.id}`}
        userNames={userNames}
        startable={ACCOUNT_TEMPLATES}
        entityType="account"
        entityId={loan.id}
        editable={true}
        summary={{
          title: "Account",
          rows: [
            ["Code", loan.contractNumber],
            [
              "Name",
              <Link key="c" href={`/customers/${customer.id}`} className="text-ygg-700 underline">
                {customer.name.toUpperCase()}
              </Link>,
            ],
            ["Type", "RENT-RC, Rent Now, Buy Later"],
            ["Status", titleCase(loan.status)],
            ["Balance", `${formatMoney(balance)} ex GST`],
            ["Start", formatDate(loan.startDate)],
            ["Arrears", loan.arrears ? "Yes — in arrears" : "No"],
          ],
        }}
      />
      </>
      )}
    </>
  );
}
