import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans, transactions, users } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { ACCOUNT_TEMPLATES } from "@/lib/workflows";
import { PageHeader, Badge } from "@/components/ui";
import { WorkflowBoard } from "@/components/WorkflowBoard";
import { loadWorkflows } from "../../workflowActions";

// Account-level workflows (collections, payout, returns), finPOWER-style.
export default async function CollectionsAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wf?: string }>;
}) {
  const { id } = await params;
  const { wf } = await searchParams;
  const loanId = Number(id);
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) notFound();
  const [customer] = await db.select().from(customers).where(eq(customers.id, loan.customerId));

  const [balanceRow] = await db
    .select({ balance: sql<number>`coalesce(sum(${transactions.amountExGstCents}), 0)::int` })
    .from(transactions)
    .where(eq(transactions.loanId, loanId));

  const entries = await loadWorkflows("account", loanId);
  const userNames = new Map((await db.select().from(users)).map((u) => [u.id, u.name]));

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
      <WorkflowBoard
        entries={entries}
        selectedId={wf ? Number(wf) : undefined}
        makeHref={(wfId) => `/collections/${loan.id}?wf=${wfId}`}
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
            ["Balance", `${formatMoney(balanceRow?.balance ?? 0)} ex GST`],
            ["Start", formatDate(loan.startDate)],
            ["Arrears", loan.arrears ? "Yes — in arrears" : "No"],
          ],
        }}
      />
    </>
  );
}
