import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationAssets,
  applicationChecklistItems,
  applications,
  assets,
  customers,
  documents,
  externalParties,
  loans,
  users,
} from "@/db/schema";
import { formatAbn } from "@/lib/abn";
import { formatDateTime, formatMoney, titleCase, todaySydney } from "@/lib/format";
import { DEFAULT_CHECKLIST } from "@/lib/checklist";
import { PageHeader, Section, Badge, DetailList, LinkButton } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";
import { DeleteButton } from "@/components/DeleteButton";
import { ConvertForm } from "../ConvertForm";
import {
  convertApplication,
  removeApplicationAsset,
  runCreditCheck,
  runIdVerification,
  runInfoAgent,
  runPpsrSearch,
  setChecklistStatus,
} from "../actions";

const STATUS_BADGE: Record<string, "green" | "red" | "amber" | "slate" | "blue"> = {
  draft: "slate",
  in_progress: "amber",
  approved: "green",
  declined: "red",
  withdrawn: "slate",
  converted: "blue",
};

const STUB_RUNNERS: Record<string, { action: (id: number) => Promise<void>; label: string }> = {
  id_matrix: { action: runIdVerification, label: "Run ID verification (stub)" },
  credit_check: { action: runCreditCheck, label: "Run credit check (stub)" },
  info_agent: { action: runInfoAgent, label: "Run Info Agent lookup (stub)" },
  ppsr_search: { action: runPpsrSearch, label: "Run PPSR search (stub)" },
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.id, application.customerId));
  const [broker] = application.brokerId
    ? await db.select().from(externalParties).where(eq(externalParties.id, application.brokerId))
    : [];
  const [owner] = application.ownerId
    ? await db.select().from(users).where(eq(users.id, application.ownerId))
    : [];
  const [loan] = await db.select().from(loans).where(eq(loans.applicationId, applicationId));

  const assetLinks = await db
    .select({ link: applicationAssets, asset: assets })
    .from(applicationAssets)
    .innerJoin(assets, eq(applicationAssets.assetId, assets.id))
    .where(eq(applicationAssets.applicationId, applicationId));

  const checklist = await db
    .select()
    .from(applicationChecklistItems)
    .where(eq(applicationChecklistItems.applicationId, applicationId))
    .orderBy(asc(applicationChecklistItems.id));
  const completedBy = new Map(
    (await db.select().from(users)).map((u) => [u.id, u.name]),
  );

  const generatedDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "application"), eq(documents.entityId, applicationId)));

  const editable = application.status !== "converted";

  return (
    <>
      <PageHeader
        title={application.reference}
        subtitle={
          <>
            <Link href={`/customers/${customer.id}`} className="text-ygg-700 underline">
              {customer.name}
            </Link>{" "}
            <Badge color={STATUS_BADGE[application.status]}>{titleCase(application.status)}</Badge>
            {loan && (
              <>
                {" "}
                <Link href={`/loans/${loan.id}`} className="text-ygg-700 underline">
                  → Loan {loan.contractNumber}
                </Link>
              </>
            )}
          </>
        }
        actions={
          editable && (
            <LinkButton href={`/applications/${application.id}/edit`} variant="primary">
              Edit
            </LinkButton>
          )
        }
      />

      <Section title="Deal snapshot">
        <DetailList
          items={[
            ["Customer ABN", customer.abn ? formatAbn(customer.abn) : "—"],
            ["Source", titleCase(application.source)],
            ["Broker", broker?.name ?? "—"],
            ["Owner", owner?.name ?? "—"],
            [
              "Deal value ex GST",
              application.dealValueExGstCents != null ? formatMoney(application.dealValueExGstCents) : "—",
            ],
            ["Rental rate (RR)", application.rentalRatePercent ? `${application.rentalRatePercent}%` : "—"],
            ["ROI", application.roiPercent ? `${application.roiPercent}%` : "—"],
            ["Term", application.termMonths ? `${application.termMonths} months` : "—"],
            [
              "Brokerage ex GST",
              application.brokerageExGstCents != null ? formatMoney(application.brokerageExGstCents) : "—",
            ],
            ["Notes", application.notes],
          ]}
        />
      </Section>

      <Section
        title="Assets"
        actions={
          editable && (
            <LinkButton href={`/applications/${application.id}/assets/new`}>Add asset</LinkButton>
          )
        }
      >
        <div className="card divide-y divide-slate-100">
          {assetLinks.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No assets on this application yet.
            </div>
          )}
          {assetLinks.map(({ link, asset }) => (
            <div key={link.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1 truncate font-medium text-ygg-700 underline">
                {asset.description}
              </Link>
              <span className="w-48 shrink-0 text-slate-600">
                {[asset.vin && `VIN ${asset.vin}`, asset.rego && `Rego ${asset.rego}`, asset.serialNumber && `S/N ${asset.serialNumber}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="w-28 shrink-0 tabular-nums text-slate-600">
                {formatMoney(asset.valueExGstCents)}
              </span>
              {editable && (
                <DeleteButton
                  action={removeApplicationAsset.bind(null, application.id, link.id)}
                  label="Remove"
                  confirmMessage={`Remove ${asset.description} from this application? The asset stays on the register.`}
                />
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Originations checklist">
        <div className="card divide-y divide-slate-100">
          {checklist.map((item) => {
            const runner = editable && item.status !== "done" ? STUB_RUNNERS[item.key] : undefined;
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-72 shrink-0 font-medium">{item.label}</span>
                <Badge
                  color={
                    item.status === "done" ? "green" : item.status === "not_applicable" ? "slate" : "amber"
                  }
                >
                  {item.status === "not_applicable" ? "N/A" : titleCase(item.status)}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-slate-500">
                  {item.status === "done" && item.completedAt
                    ? `${formatDateTime(item.completedAt)} by ${completedBy.get(item.completedBy ?? -1) ?? "—"}${item.notes ? ` · ${item.notes}` : ""}`
                    : item.notes}
                </span>
                {editable && (
                  <span className="flex shrink-0 items-center gap-2">
                    {runner && (
                      <form action={runner.action.bind(null, application.id)}>
                        <button type="submit" className="btn-secondary text-xs">
                          {runner.label}
                        </button>
                      </form>
                    )}
                    {item.status !== "done" ? (
                      <form action={setChecklistStatus.bind(null, application.id, item.id, "done")}>
                        <button type="submit" className="btn-secondary text-xs">
                          Mark done
                        </button>
                      </form>
                    ) : (
                      <form action={setChecklistStatus.bind(null, application.id, item.id, "pending")}>
                        <button type="submit" className="btn-secondary text-xs">
                          Reopen
                        </button>
                      </form>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Documents">
        <div className="card p-4">
          <div className="flex flex-wrap gap-2">
            <a href={`/applications/${application.id}/documents/credit-approval`} className="btn-secondary">
              Generate credit approval (.docx)
            </a>
            <a href={`/applications/${application.id}/documents/contract`} className="btn-secondary">
              Generate rental contract (.docx)
            </a>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Documents are filled from the editable Word templates in the app&apos;s templates folder and
            downloaded — each generation is recorded below.
          </p>
          {generatedDocs.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {generatedDocs.map((d) => (
                <li key={d.id}>
                  {d.path} — generated {formatDateTime(d.generatedAt)} by{" "}
                  {completedBy.get(d.generatedBy ?? -1) ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {application.status === "approved" && !loan && (
        <Section title="Open loan account">
          <ConvertForm
            action={convertApplication.bind(null, application.id)}
            defaultStartDate={todaySydney()}
          />
        </Section>
      )}

      <AuditTrail entityType="application" entityId={application.id} />
    </>
  );
}
