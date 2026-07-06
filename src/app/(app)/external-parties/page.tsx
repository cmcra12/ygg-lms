import { asc } from "drizzle-orm";
import { db } from "@/db";
import { externalParties } from "@/db/schema";
import { formatAbn } from "@/lib/abn";
import { titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function ExternalPartiesPage() {
  const rows = db.select().from(externalParties).orderBy(asc(externalParties.name)).all();
  const nameById = new Map(rows.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        title="External parties"
        subtitle="Brokers, vendors, referrers and aggregators"
        actions={<LinkButton href="/external-parties/new" variant="primary">New party</LinkButton>}
      />
      <DataTable
        filename="external-parties"
        columns={[
          { key: "name", header: "Name" },
          { key: "type", header: "Type" },
          { key: "contact", header: "Contact" },
          { key: "abn", header: "ABN" },
          { key: "accreditation", header: "Accreditation" },
          { key: "aggregator", header: "Aggregator" },
          { key: "status", header: "Status" },
        ]}
        rows={rows.map((p) => ({
          href: `/external-parties/${p.id}`,
          cells: {
            name: p.name,
            type: titleCase(p.type),
            contact: p.contactName,
            abn: p.abn ? formatAbn(p.abn) : "",
            accreditation: {
              text: titleCase(p.accreditationStatus),
              badge:
                p.accreditationStatus === "accredited"
                  ? "green"
                  : p.accreditationStatus === "suspended"
                    ? "red"
                    : p.accreditationStatus === "pending"
                      ? "amber"
                      : "slate",
            },
            aggregator: p.aggregatorId != null ? (nameById.get(p.aggregatorId) ?? "") : "",
            status: { text: titleCase(p.status), badge: p.status === "active" ? "green" : "slate" },
          },
        }))}
      />
    </>
  );
}
