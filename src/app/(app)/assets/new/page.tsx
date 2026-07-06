import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, loans } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { AssetForm } from "../AssetForm";
import { saveAsset } from "../actions";

export default async function NewAssetPage() {
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
      <PageHeader title="New asset" />
      <AssetForm
        action={saveAsset.bind(null, null)}
        customers={customerOptions}
        loans={loanOptions}
        cancelHref="/assets"
      />
    </>
  );
}
