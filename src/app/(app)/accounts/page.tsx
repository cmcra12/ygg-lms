import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans, transactions } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function LoansPage() {
  const rows = await db
    .select({ loan: loans, customer: customers })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .orderBy(asc(loans.contractNumber))
    ;

  const balances = new Map<number, number>();
  const loanIds = rows.map((r) => r.loan.id);
  if (loanIds.length > 0) {
    const sums = await db
      .select({
        loanId: transactions.loanId,
        // sum() over integers is bigint in Postgres — cast to float8 so the driver returns a number without overflowing int4 on a large book
        balance: sql<number>`coalesce(sum(${transactions.amountExGstCents}), 0)::float8`,
      })
      .from(transactions)
      .where(inArray(transactions.loanId, loanIds))
      .groupBy(transactions.loanId)
      ;
    for (const s of sums) balances.set(s.loanId, s.balance);
  }

  return (
    <>
      <PageHeader title="Accounts" subtitle={`${rows.length} rental accounts`} />
      <DataTable
        filename="accounts"
        columns={[
          { key: "contract", header: "Contract" },
          { key: "customer", header: "Customer" },
          { key: "start", header: "Start" },
          { key: "term", header: "Min return", align: "right" },
          { key: "frequency", header: "Frequency" },
          { key: "balance", header: "Balance (ex GST)", align: "right" },
          { key: "status", header: "Status" },
          { key: "arrears", header: "Arrears" },
        ]}
        rows={rows.map(({ loan, customer }) => {
          const balance = balances.get(loan.id) ?? 0;
          return {
            href: `/accounts/${loan.id}`,
            cells: {
              contract: loan.contractNumber,
              customer: customer.name,
              start: { text: formatDate(loan.startDate), sort: loan.startDate },
              term: { text: `${loan.termMonths} mths`, sort: loan.termMonths },
              frequency: titleCase(loan.paymentFrequency),
              balance: { text: formatMoney(balance), sort: balance },
              status: {
                text: titleCase(loan.status),
                badge: loan.status === "active" ? "green" : loan.status === "paid_out" ? "slate" : "red",
              },
              arrears: loan.arrears ? { text: "Arrears", badge: "red" } : "",
            },
          };
        })}
      />
    </>
  );
}
