import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { externalParties } from "@/db/schema";
import { formatAbn } from "@/lib/abn";
import { titleCase } from "@/lib/format";
import { PageHeader, Section, Badge, DetailList, LinkButton } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";

export default async function ExternalPartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partyId = Number(id);
  const [party] = db.select().from(externalParties).where(eq(externalParties.id, partyId)).all();
  if (!party) notFound();

  const aggregator =
    party.aggregatorId != null
      ? db.select().from(externalParties).where(eq(externalParties.id, party.aggregatorId)).all()[0]
      : undefined;

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle={
          <>
            {titleCase(party.type)}{" "}
            <Badge color={party.status === "active" ? "green" : "slate"}>{titleCase(party.status)}</Badge>
          </>
        }
        actions={<LinkButton href={`/external-parties/${party.id}/edit`} variant="primary">Edit</LinkButton>}
      />
      <Section title="Details">
        <DetailList
          items={[
            ["Contact", party.contactName],
            ["Email", party.email],
            ["Phone", party.phone],
            ["ABN", party.abn ? formatAbn(party.abn) : "—"],
            ["Accreditation", titleCase(party.accreditationStatus)],
            ["Paid before", party.paidBefore ? "Yes" : "No"],
            ["Aggregator", aggregator?.name ?? "—"],
            [
              "Bank account",
              party.bsb
                ? `${party.accountName ?? ""} · BSB ${party.bsb} · Acc ${party.accountNumber ?? ""}`
                : "—",
            ],
            ["Notes", party.notes],
          ]}
        />
      </Section>
      <AuditTrail entityType="external_party" entityId={party.id} />
    </>
  );
}
