import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { applications, customers, externalParties, users } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

const STATUS_BADGE: Record<string, "green" | "red" | "amber" | "slate" | "blue"> = {
  draft: "slate",
  in_progress: "amber",
  approved: "green",
  declined: "red",
  withdrawn: "slate",
  converted: "blue",
};

export default async function ApplicationsPage() {
  const broker = alias(externalParties, "broker");
  const rows = await db
    .select({ application: applications, customer: customers, broker, owner: users })
    .from(applications)
    .innerJoin(customers, eq(applications.customerId, customers.id))
    .leftJoin(broker, eq(applications.brokerId, broker.id))
    .leftJoin(users, eq(applications.ownerId, users.id))
    .orderBy(desc(applications.id));

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="Originations pipeline"
        actions={<LinkButton href="/applications/new" variant="primary">New application</LinkButton>}
      />
      <DataTable
        filename="applications"
        filters={["status", "source"]}
        columns={[
          { key: "reference", header: "Reference" },
          { key: "customer", header: "Customer" },
          { key: "status", header: "Status" },
          { key: "source", header: "Source" },
          { key: "broker", header: "Broker" },
          { key: "value", header: "Value ex GST", align: "right" },
          { key: "term", header: "Min return", align: "right" },
          { key: "owner", header: "Owner" },
          { key: "created", header: "Created" },
        ]}
        rows={rows.map(({ application: a, customer, broker: b, owner }) => ({
          href: `/applications/${a.id}`,
          cells: {
            reference: a.reference,
            customer: customer.name,
            status: { text: titleCase(a.status), badge: STATUS_BADGE[a.status] },
            source: titleCase(a.source),
            broker: b?.name ?? "",
            value: {
              text: a.dealValueExGstCents != null ? formatMoney(a.dealValueExGstCents) : "",
              sort: a.dealValueExGstCents ?? 0,
            },
            term: { text: a.termMonths ? `${a.termMonths} mths` : "", sort: a.termMonths ?? 0 },
            owner: owner?.name ?? "",
            created: { text: formatDate(a.createdAt.slice(0, 10)), sort: a.createdAt },
          },
        }))}
      />
    </>
  );
}
