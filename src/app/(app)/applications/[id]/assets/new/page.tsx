import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, customers } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { FormFrame } from "@/components/FormFrame";
import { addApplicationAsset } from "../../../actions";

export default async function NewApplicationAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) notFound();
  const [customer] = await db.select().from(customers).where(eq(customers.id, application.customerId));

  return (
    <>
      <PageHeader
        title={`Add asset — ${application.reference}`}
        subtitle={`Asset will be linked to ${customer.name}`}
      />
      <FormFrame
        action={addApplicationAsset.bind(null, applicationId)}
        submitLabel="Add asset"
        cancelHref={`/applications/${applicationId}`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Description *</label>
            <input name="description" required className="field-input" />
          </div>
          <div>
            <label className="field-label">Category</label>
            <input name="category" className="field-input" placeholder="e.g. Excavator, Prime Mover" />
          </div>
          <div>
            <label className="field-label">Value ex GST ($)</label>
            <input name="value" className="field-input" />
          </div>
          <div>
            <label className="field-label">VIN</label>
            <input name="vin" className="field-input" />
          </div>
          <div>
            <label className="field-label">Rego</label>
            <input name="rego" className="field-input" />
          </div>
          <div>
            <label className="field-label">Serial number</label>
            <input name="serialNumber" className="field-input" />
          </div>
        </div>
      </FormFrame>
    </>
  );
}
