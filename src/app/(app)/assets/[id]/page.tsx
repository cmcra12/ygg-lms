import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { assets, customers, loans, ppsrEvents, ppsrRegistrations } from "@/db/schema";
import { formatDate, formatMoney, titleCase } from "@/lib/format";
import { PageHeader, Section, Badge, DetailList, LinkButton } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";

const PPSR_BADGE: Record<string, "green" | "red" | "amber" | "slate"> = {
  registered: "green",
  renewed: "green",
  searched: "amber",
  discharged: "slate",
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset) notFound();

  const [customer] = asset.customerId
    ? await db.select().from(customers).where(eq(customers.id, asset.customerId))
    : [];
  const [loan] = asset.loanId ? await db.select().from(loans).where(eq(loans.id, asset.loanId)) : [];

  const registrations = await db
    .select()
    .from(ppsrRegistrations)
    .where(eq(ppsrRegistrations.assetId, assetId))
    .orderBy(desc(ppsrRegistrations.id))
    ;

  const allEvents =
    registrations.length === 0
      ? []
      : await db
          .select()
          .from(ppsrEvents)
          .where(inArray(ppsrEvents.registrationId, registrations.map((r) => r.id)))
          .orderBy(desc(ppsrEvents.date));
  const eventsByRegistration = new Map<number, typeof allEvents>();
  for (const e of allEvents) {
    const list = eventsByRegistration.get(e.registrationId) ?? [];
    list.push(e);
    eventsByRegistration.set(e.registrationId, list);
  }

  return (
    <>
      <PageHeader
        title={asset.description}
        subtitle={
          <Badge color={asset.status === "active" ? "green" : asset.status === "sold" ? "amber" : "slate"}>
            {titleCase(asset.status)}
          </Badge>
        }
        actions={<LinkButton href={`/assets/${asset.id}/edit`} variant="primary">Edit</LinkButton>}
      />

      <Section title="Details">
        <DetailList
          items={[
            ["Category", asset.category],
            ["VIN", asset.vin],
            ["Rego", asset.rego],
            ["Serial number", asset.serialNumber],
            ["Value ex GST", asset.valueExGstCents != null ? formatMoney(asset.valueExGstCents) : "—"],
            [
              "Current customer",
              customer ? (
                <Link href={`/customers/${customer.id}`} className="text-ygg-700 underline">
                  {customer.name}
                </Link>
              ) : (
                "—"
              ),
            ],
            [
              "Current loan",
              loan ? (
                <Link href={`/loans/${loan.id}`} className="text-ygg-700 underline">
                  {loan.contractNumber}
                </Link>
              ) : (
                "—"
              ),
            ],
            ["Notes", asset.notes],
          ]}
        />
      </Section>

      <Section title="PPSR registrations">
        <div className="card divide-y divide-slate-100">
          {registrations.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No PPSR registrations recorded.
            </div>
          )}
          {registrations.map((r) => {
            const events = eventsByRegistration.get(r.id) ?? [];
            return (
              <div key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{r.registrationNumber ?? "(not yet registered)"}</span>
                  <Badge color="blue">{r.kind.toUpperCase()}</Badge>
                  <Badge color={PPSR_BADGE[r.status]}>{titleCase(r.status)}</Badge>
                  <span className="text-slate-500">
                    {r.registeredDate && `Registered ${formatDate(r.registeredDate)}`}
                    {r.expiryDate && ` · Expires ${formatDate(r.expiryDate)}`}
                  </span>
                </div>
                {events.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                    {events.map((e) => (
                      <li key={e.id}>
                        {formatDate(e.date)} — {titleCase(e.event)}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <AuditTrail entityType="asset" entityId={asset.id} />
    </>
  );
}
