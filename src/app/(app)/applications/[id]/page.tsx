import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationApplicants,
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
import { formatDate, formatDateTime, formatMoney, titleCase, todaySydney } from "@/lib/format";
import { PageHeader, Section, Badge, DetailList, LinkButton } from "@/components/ui";
import { AuditTrail } from "@/components/AuditTrail";
import { DeleteButton } from "@/components/DeleteButton";
import { ConvertForm } from "../ConvertForm";
import {
  convertApplication,
  deleteApplicant,
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

const TABS = [
  { key: "key-details", label: "Key Details" },
  { key: "applicants", label: "Applicants" },
  { key: "assets", label: "Assets" },
  { key: "checklist", label: "Checklist" },
  { key: "documents", label: "Documents" },
  { key: "workflows", label: "Workflows" },
  { key: "history", label: "History" },
] as const;

const ENTITY_TYPE_LABEL: Record<string, string> = {
  pty_ltd: "Pty Ltd",
  limited: "Limited",
  sole_trader: "Sole Trader",
  trust: "Trust",
  partnership: "Partnership",
};

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "key-details";

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

  const applicants = await db
    .select()
    .from(applicationApplicants)
    .where(eq(applicationApplicants.applicationId, applicationId))
    .orderBy(asc(applicationApplicants.position));

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
  const completedBy = new Map((await db.select().from(users)).map((u) => [u.id, u.name]));

  const generatedDocs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "application"), eq(documents.entityId, applicationId)));

  const editable = application.status !== "converted";
  const tabHref = (key: string) => `/applications/${application.id}?tab=${key}`;

  return (
    <>
      <PageHeader
        title={`${application.reference}: ${(application.tradingName ?? customer.name).toUpperCase()}`}
        subtitle={
          <>
            <Link href={`/customers/${customer.id}`} className="text-ygg-700 underline">
              {customer.name}
            </Link>{" "}
            <Badge color={STATUS_BADGE[application.status]}>{titleCase(application.status)}</Badge>
            {loan && (
              <>
                {" "}
                <Link href={`/accounts/${loan.id}`} className="text-ygg-700 underline">
                  → Account {loan.contractNumber}
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

      {/* finPOWER-style tab strip */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-300">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border border-b-0 border-slate-300 bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.key === "applicants" && applicants.length > 0 && (
              <span className="ml-1.5 rounded-full bg-ygg-400 px-1.5 text-[10px] font-bold text-slate-900">
                {applicants.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {tab === "key-details" && (
        <>
          <Section title="Deal snapshot">
            <DetailList
              items={[
                ["Customer ABN", customer.abn ? formatAbn(customer.abn) : "—"],
                ["Source", titleCase(application.source)],
                ["Broker", broker?.name ?? "—"],
                ["Owner", owner?.name ?? "—"],
                [
                  "Amount required ex GST",
                  application.dealValueExGstCents != null ? formatMoney(application.dealValueExGstCents) : "—",
                ],
                ["Rental rate (RR)", application.rentalRatePercent ? `${application.rentalRatePercent}%` : "—"],
                ["ROI", application.roiPercent ? `${application.roiPercent}%` : "—"],
                ["Minimum return", application.termMonths ? `${application.termMonths} months` : "—"],
                [
                  "Brokerage ex GST",
                  application.brokerageExGstCents != null ? formatMoney(application.brokerageExGstCents) : "—",
                ],
                ["Notes", application.notes],
              ]}
            />
          </Section>

          <Section title="Business information">
            <DetailList
              items={[
                ["Trading name", application.tradingName],
                ["Entity type", application.entityType ? ENTITY_TYPE_LABEL[application.entityType] : "—"],
                [
                  "Trustee",
                  application.trusteeType
                    ? `${titleCase(application.trusteeType)}${application.trusteeName ? ` — ${application.trusteeName}` : ""}`
                    : "—",
                ],
                ["Total years trading", application.yearsTrading],
                ["Nature of business", application.natureOfBusiness],
                ["Business phone", application.businessPhone],
                [
                  "Business address",
                  [
                    application.businessAddressLine1,
                    application.businessSuburb,
                    application.businessState,
                    application.businessPostcode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
                ["Premises", application.premises ? titleCase(application.premises) : "—"],
                ["Employees in business", application.employeesCount],
                ["Machines in fleet", application.machinesInFleet],
              ]}
            />
          </Section>

          {application.status === "approved" && !loan && (
            <Section title="Open loan account">
              <ConvertForm
                action={convertApplication.bind(null, application.id)}
                defaultStartDate={todaySydney()}
              />
            </Section>
          )}
        </>
      )}

      {tab === "applicants" && (
        <Section
          title="Applicants"
          actions={
            editable &&
            applicants.length < 2 && (
              <LinkButton href={`/applications/${application.id}/applicants/new`}>
                Add applicant
              </LinkButton>
            )
          }
        >
          {applicants.length === 0 && (
            <div className="card px-4 py-8 text-center text-sm text-slate-400">
              No applicants recorded yet — the application form covers up to two applicants.
            </div>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            {applicants.map((a) => {
              const netWorth =
                a.totalAssetsCents != null || a.totalLiabilitiesCents != null
                  ? (a.totalAssetsCents ?? 0) - (a.totalLiabilitiesCents ?? 0)
                  : null;
              return (
                <div key={a.id} className="card p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold">
                      Applicant {a.position} — {a.firstName} {a.middleName ?? ""} {a.surname}
                    </h3>
                    <span className="flex items-center gap-2">
                      <Badge color={a.privacyAcknowledged ? "green" : "amber"}>
                        {a.privacyAcknowledged ? "Privacy acknowledged" : "Privacy pending"}
                      </Badge>
                      {editable && (
                        <>
                          <Link
                            href={`/applications/${application.id}/applicants/${a.id}/edit`}
                            className="text-xs text-ygg-700 underline"
                          >
                            Edit
                          </Link>
                          <DeleteButton
                            action={deleteApplicant.bind(null, application.id, a.id)}
                            confirmMessage={`Remove applicant ${a.firstName} ${a.surname}?`}
                          />
                        </>
                      )}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {(
                      [
                        ["Date of birth", a.dateOfBirth ? formatDate(a.dateOfBirth) : "—"],
                        ["Gender", a.gender ? titleCase(a.gender) : "—"],
                        ["Industry experience", a.yearsIndustryExperience != null ? `${a.yearsIndustryExperience} years` : "—"],
                        ["Born", a.cityCountryOfBirth ?? "—"],
                        ["Licence no.", a.driversLicenceNo ?? "—"],
                        ["Licence expiry", a.driversLicenceExpiry ? formatDate(a.driversLicenceExpiry) : "—"],
                        ["Drivers card no.", a.driversCardNo ?? "—"],
                        ["Medicare", a.medicareNo ? `${a.medicareNo}${a.medicarePosition ? ` (pos ${a.medicarePosition})` : ""}` : "—"],
                        ["Mobile", a.mobile ?? "—"],
                        ["Email", a.email ?? "—"],
                        [
                          "Home address",
                          [a.homeAddressLine1, a.homeSuburb, a.homeState, a.homePostcode].filter(Boolean).join(", ") || "—",
                        ],
                        ["Housing", a.homeOwnership ? titleCase(a.homeOwnership) : "—"],
                      ] as Array<[string, React.ReactNode]>
                    ).map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="text-slate-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assets &amp; liabilities statement
                    </div>
                    <div className="grid grid-cols-3 gap-2 tabular-nums">
                      <div>
                        <div className="text-xs text-slate-500">Total assets</div>
                        <div className="font-semibold">{formatMoney(a.totalAssetsCents)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Less liabilities</div>
                        <div className="font-semibold">{formatMoney(a.totalLiabilitiesCents)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Net worth</div>
                        <div className="font-semibold">{netWorth != null ? formatMoney(netWorth) : "—"}</div>
                      </div>
                    </div>
                    {(a.assetsDetail || a.liabilitiesDetail || a.comments) && (
                      <div className="mt-2 space-y-1 whitespace-pre-wrap text-xs text-slate-600">
                        {a.assetsDetail && <div>Assets: {a.assetsDetail}</div>}
                        {a.liabilitiesDetail && <div>Liabilities: {a.liabilitiesDetail}</div>}
                        {a.comments && <div>Comments: {a.comments}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {tab === "assets" && (
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
                <Link
                  href={`/assets/${asset.id}`}
                  className="min-w-0 flex-1 truncate font-medium text-ygg-700 underline"
                >
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
      )}

      {tab === "checklist" && (
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
      )}

      {tab === "documents" && (
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
      )}

      {tab === "workflows" && (
        <Section title="Workflows">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ygg-400" />
            <h3 className="text-base font-semibold text-slate-800">Workflows are coming</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              This tab will hold the origination workflows — status change rules, monitor categories
              and step-by-step processing like finPOWER&apos;s Workflows screen. The layout is ready for
              the workflow definitions to be configured.
            </p>
          </div>
        </Section>
      )}

      {tab === "history" && <AuditTrail entityType="application" entityId={application.id} />}
    </>
  );
}
