import { asc } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { formatAbn } from "@/lib/abn";
import { titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function CustomersPage() {
  const rows = db.select().from(customers).orderBy(asc(customers.name)).all();

  return (
    <>
      <PageHeader
        title="Customers"
        actions={<LinkButton href="/customers/new" variant="primary">New customer</LinkButton>}
      />
      <DataTable
        filename="customers"
        columns={[
          { key: "code", header: "Code" },
          { key: "name", header: "Name" },
          { key: "type", header: "Type" },
          { key: "abn", header: "ABN" },
          { key: "phone", header: "Phone" },
          { key: "suburb", header: "Suburb" },
          { key: "status", header: "Status" },
        ]}
        rows={rows.map((c) => ({
          href: `/customers/${c.id}`,
          cells: {
            code: c.code,
            name: c.name,
            type: titleCase(c.type),
            abn: c.abn ? formatAbn(c.abn) : "",
            phone: c.phone,
            suburb: c.suburb,
            status: { text: titleCase(c.status), badge: c.status === "active" ? "green" : "slate" },
          },
        }))}
      />
    </>
  );
}
