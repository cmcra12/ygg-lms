import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans, transactions } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

// Payment history drilldown: every payment across all of a customer's loans.
export default async function CustomerPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  const customerLoans = await db.select().from(loans).where(eq(loans.customerId, customerId));
  const loanById = new Map(customerLoans.map((l) => [l.id, l]));
  const loanIds = customerLoans.map((l) => l.id);

  const payments = (
    loanIds.length === 0
      ? []
      : await db
          .select()
          .from(transactions)
          .where(inArray(transactions.loanId, loanIds))
          .orderBy(desc(transactions.date), desc(transactions.id))
  ).filter((t) => t.type === "payment" || t.type === "dishonour_fee");

  const totalReceived = payments
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amountExGstCents, 0);

  return (
    <>
      <PageHeader
        title={`Payment history — ${customer.name}`}
        subtitle={`${payments.filter((p) => p.type === "payment").length} payments received, total ${formatMoney(-totalReceived)} ex GST`}
        actions={<LinkButton href={`/customers/${customerId}`}>Back to customer</LinkButton>}
      />
      <DataTable
        filename={`payments-${customer.code}`}
        columns={[
          { key: "date", header: "Date" },
          { key: "loan", header: "Account" },
          { key: "type", header: "Type" },
          { key: "reference", header: "Reference" },
          { key: "source", header: "Source" },
          { key: "amount", header: "Amount (ex GST)", align: "right" },
        ]}
        rows={payments.map((t) => {
          const loan = loanById.get(t.loanId)!;
          const total = t.amountExGstCents;
          return {
            href: `/accounts/${loan.id}`,
            cells: {
              date: { text: formatDate(t.date), sort: t.date },
              loan: loan.contractNumber,
              type: {
                text: titleCase(t.type),
                badge: t.type === "payment" ? "green" : "red",
              },
              reference: t.reference,
              source: titleCase(t.source),
              amount: { text: formatMoney(total), sort: total },
            },
          };
        })}
        emptyMessage="No payments recorded for this customer."
      />
    </>
  );
}
