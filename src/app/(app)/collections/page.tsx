import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans, transactions, workflows } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { workflowCode } from "@/lib/workflows";
import { PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

// Collections — accounts flagged in arrears, with their collections workflows.
export default async function CollectionsPage() {
  const rows = await db
    .select({ loan: loans, customer: customers })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .where(and(eq(loans.status, "active"), eq(loans.arrears, true)));

  const loanIds = rows.map((r) => r.loan.id);
  const balances = new Map<number, number>();
  if (loanIds.length > 0) {
    const sums = await db
      .select({
        loanId: transactions.loanId,
        balance: sql<number>`coalesce(sum(${transactions.amountExGstCents}), 0)::int`,
      })
      .from(transactions)
      .where(inArray(transactions.loanId, loanIds))
      .groupBy(transactions.loanId);
    for (const s of sums) balances.set(s.loanId, s.balance);
  }

  const collectionWorkflows =
    loanIds.length === 0
      ? []
      : await db
          .select()
          .from(workflows)
          .where(and(eq(workflows.entityType, "account"), inArray(workflows.entityId, loanIds)));
  const workflowByLoan = new Map(
    collectionWorkflows
      .filter((w) => w.templateKey === "collections")
      .map((w) => [w.entityId, w]),
  );

  return (
    <>
      <PageHeader
        title="Collections"
        subtitle="Active accounts flagged in arrears — open a collections workflow to work each one"
      />
      <DataTable
        filename="collections"
        columns={[
          { key: "contract", header: "Account" },
          { key: "customer", header: "Customer" },
          { key: "start", header: "Start" },
          { key: "balance", header: "Balance (ex GST)", align: "right" },
          { key: "workflow", header: "Collections workflow" },
        ]}
        rows={rows.map(({ loan, customer }) => {
          const wf = workflowByLoan.get(loan.id);
          const balance = balances.get(loan.id) ?? 0;
          return {
            href: `/collections/${loan.id}`,
            cells: {
              contract: loan.contractNumber,
              customer: customer.name,
              start: { text: formatDate(loan.startDate), sort: loan.startDate },
              balance: { text: formatMoney(balance), sort: balance },
              workflow: wf
                ? {
                    text: `${workflowCode(wf.id)} — ${titleCase(wf.status)}`,
                    badge: wf.status === "open" ? "amber" : "green",
                  }
                : { text: "Not started", badge: "slate" },
            },
          };
        })}
        emptyMessage="No accounts in arrears — nothing in collections."
      />
    </>
  );
}
