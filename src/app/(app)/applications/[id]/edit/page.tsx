import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, customers, externalParties, users } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ApplicationForm } from "../../ApplicationForm";
import { saveApplication } from "../../actions";

export default async function EditApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicationId = Number(id);
  const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!application) notFound();
  if (application.status === "converted") redirect(`/applications/${applicationId}`);

  const customerOptions = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .orderBy(asc(customers.name));
  const brokerOptions = await db
    .select({ id: externalParties.id, name: externalParties.name })
    .from(externalParties)
    .where(eq(externalParties.type, "broker"))
    .orderBy(asc(externalParties.name));
  const ownerOptions = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));

  return (
    <>
      <PageHeader title={`Edit ${application.reference}`} />
      <ApplicationForm
        action={saveApplication.bind(null, applicationId)}
        initial={application}
        customers={customerOptions}
        brokers={brokerOptions}
        owners={ownerOptions}
        cancelHref={`/applications/${applicationId}`}
      />
    </>
  );
}
