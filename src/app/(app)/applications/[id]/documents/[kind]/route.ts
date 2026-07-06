import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applicationAssets,
  applicationChecklistItems,
  applications,
  assets,
  customers,
  documents,
  externalParties,
} from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatAbn, formatAcn } from "@/lib/abn";
import { formatDate, formatMoney, todaySydney } from "@/lib/format";
import { renderDocx } from "@/lib/documents";

const KINDS: Record<string, { template: string; checklistKey: string; filePrefix: string }> = {
  "credit-approval": { template: "credit-approval.docx", checklistKey: "ca_generated", filePrefix: "CA" },
  contract: { template: "rental-contract.docx", checklistKey: "contract_generated", filePrefix: "Contract" },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", _request.url));
  if (!can(user, "records:write")) return new NextResponse("Forbidden", { status: 403 });

  const { id, kind } = await params;
  const config = KINDS[kind];
  if (!config) return new NextResponse("Unknown document kind", { status: 404 });

  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) return new NextResponse("Application not found", { status: 404 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, application.customerId));
  const [broker] = application.brokerId
    ? await db.select().from(externalParties).where(eq(externalParties.id, application.brokerId))
    : [];
  const assetLinks = await db
    .select({ asset: assets })
    .from(applicationAssets)
    .innerJoin(assets, eq(applicationAssets.assetId, assets.id))
    .where(eq(applicationAssets.applicationId, applicationId));

  const buffer = renderDocx(config.template, {
    generated_date: formatDate(todaySydney()),
    generated_by: user.name,
    application_reference: application.reference,
    customer_name: customer.name,
    customer_abn: customer.abn ? formatAbn(customer.abn) : "—",
    customer_acn: customer.acn ? formatAcn(customer.acn) : "—",
    customer_address:
      [customer.addressLine1, customer.addressLine2, customer.suburb, customer.state, customer.postcode]
        .filter(Boolean)
        .join(", ") || "—",
    assets: assetLinks.map(({ asset }) => ({
      description: asset.description,
      vin: asset.vin ?? "—",
      rego: asset.rego ?? "—",
      serial: asset.serialNumber ?? "—",
      value_ex_gst: asset.valueExGstCents != null ? formatMoney(asset.valueExGstCents) : "—",
    })),
    deal_value:
      application.dealValueExGstCents != null ? formatMoney(application.dealValueExGstCents) : "—",
    rr: application.rentalRatePercent ?? "—",
    roi: application.roiPercent ?? "—",
    term_months: application.termMonths ?? "—",
    brokerage:
      application.brokerageExGstCents != null ? formatMoney(application.brokerageExGstCents) : "—",
    broker_name: broker?.name ?? "Direct",
  });

  const filename = `${config.filePrefix}-${application.reference}.docx`;
  await auditedInsert(user, documents, "document", {
    template: config.template,
    entityType: "application",
    entityId: applicationId,
    path: filename,
    generatedBy: user.id,
    generatedAt: new Date().toISOString(),
  });
  const [item] = await db
    .select()
    .from(applicationChecklistItems)
    .where(
      and(
        eq(applicationChecklistItems.applicationId, applicationId),
        eq(applicationChecklistItems.key, config.checklistKey),
      ),
    );
  if (item && item.status !== "done") {
    await auditedUpdate(user, applicationChecklistItems, "application_checklist_item", item.id, {
      status: "done",
      completedBy: user.id,
      completedAt: new Date().toISOString(),
      notes: `Generated ${filename}`,
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
