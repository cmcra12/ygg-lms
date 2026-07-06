import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, externalParties, users } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ApplicationForm } from "../ApplicationForm";
import { saveApplication } from "../actions";

export default async function NewApplicationPage() {
  const customerOptions = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.status, "active"))
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
      <PageHeader title="New application" />
      <ApplicationForm
        action={saveApplication.bind(null, null)}
        customers={customerOptions}
        brokers={brokerOptions}
        owners={ownerOptions}
        cancelHref="/applications"
      />
    </>
  );
}
