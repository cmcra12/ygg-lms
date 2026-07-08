import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, searches, users } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { SEARCH_TYPES, SEARCH_TYPE_KEYS } from "@/lib/searchTypes";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function SearchesPage() {
  const rows = await db
    .select({ search: searches, customer: customers, runBy: users })
    .from(searches)
    .leftJoin(customers, eq(searches.customerId, customers.id))
    .leftJoin(users, eq(searches.runBy, users.id))
    .orderBy(desc(searches.id));

  return (
    <>
      <PageHeader
        title="Searches"
        subtitle="Every search is saved to the customer's account"
        actions={<LinkButton href="/searches/new" variant="primary">New search</LinkButton>}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {SEARCH_TYPE_KEYS.map((key) => (
          <LinkButton key={key} href={`/searches/new?type=${key}`}>
            {SEARCH_TYPES[key].label}
          </LinkButton>
        ))}
      </div>
      <DataTable
        filename="searches"
        filters={["type", "customer"]}
        columns={[
          { key: "when", header: "When" },
          { key: "type", header: "Type" },
          { key: "subject", header: "Subject" },
          { key: "customer", header: "Customer" },
          { key: "result", header: "Result" },
          { key: "reference", header: "Reference" },
          { key: "runBy", header: "Run by" },
        ]}
        rows={rows.map(({ search, customer, runBy }) => ({
          href: customer ? `/customers/${customer.id}` : undefined,
          cells: {
            when: { text: formatDateTime(search.createdAt), sort: search.createdAt },
            type: { text: SEARCH_TYPES[search.type].label, badge: "blue" },
            subject: search.subject,
            customer: customer?.name ?? "",
            result: search.result,
            reference: search.reference,
            runBy: runBy?.name ?? "",
          },
        }))}
        emptyMessage="No searches run yet."
      />
    </>
  );
}
