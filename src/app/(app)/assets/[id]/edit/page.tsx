import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, customers, loans } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { AssetForm } from "../../AssetForm";
import { saveAsset } from "../../actions";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = Number(id);
  const [asset] = db.select().from(assets).where(eq(assets.id, assetId)).all();
  if (!asset) notFound();

  const customerOptions = db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .orderBy(asc(customers.name))
    .all();
  const loanOptions = db
    .select({ id: loans.id, contractNumber: loans.contractNumber, customerName: customers.name })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .orderBy(asc(loans.contractNumber))
    .all();

  return (
    <>
      <PageHeader title={`Edit ${asset.description}`} />
      <AssetForm
        action={saveAsset.bind(null, assetId)}
        initial={asset}
        customers={customerOptions}
        loans={loanOptions}
        cancelHref={`/assets/${assetId}`}
      />
    </>
  );
}
