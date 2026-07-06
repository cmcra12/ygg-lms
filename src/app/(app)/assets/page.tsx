import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, customers, loans } from "@/db/schema";
import { formatMoney, titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

// Master asset register — spreadsheet-style, filterable, exportable.
export default async function AssetsPage() {
  const rows = db
    .select({ asset: assets, customer: customers, loan: loans })
    .from(assets)
    .leftJoin(customers, eq(assets.customerId, customers.id))
    .leftJoin(loans, eq(assets.loanId, loans.id))
    .orderBy(asc(assets.description))
    .all();

  return (
    <>
      <PageHeader
        title="Master asset register"
        subtitle={`${rows.length} assets`}
        actions={<LinkButton href="/assets/new" variant="primary">New asset</LinkButton>}
      />
      <DataTable
        filename="asset-register"
        columns={[
          { key: "description", header: "Description" },
          { key: "category", header: "Category" },
          { key: "vin", header: "VIN" },
          { key: "rego", header: "Rego" },
          { key: "serial", header: "Serial" },
          { key: "value", header: "Value ex GST", align: "right" },
          { key: "customer", header: "Customer" },
          { key: "loan", header: "Loan" },
          { key: "status", header: "Status" },
        ]}
        rows={rows.map(({ asset, customer, loan }) => ({
          href: `/assets/${asset.id}`,
          cells: {
            description: asset.description,
            category: asset.category,
            vin: asset.vin,
            rego: asset.rego,
            serial: asset.serialNumber,
            value: {
              text: asset.valueExGstCents != null ? formatMoney(asset.valueExGstCents) : "",
              sort: asset.valueExGstCents ?? 0,
            },
            customer: customer?.name ?? "",
            loan: loan?.contractNumber ?? "",
            status: {
              text: titleCase(asset.status),
              badge: asset.status === "active" ? "green" : asset.status === "sold" ? "amber" : "slate",
            },
          },
        }))}
      />
    </>
  );
}
