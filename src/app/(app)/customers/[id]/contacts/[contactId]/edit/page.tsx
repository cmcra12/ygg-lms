import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customerContacts, customers } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "../../ContactForm";
import { saveContact } from "../../../../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id, contactId } = await params;
  const customerId = Number(id);
  const [customer] = db.select().from(customers).where(eq(customers.id, customerId)).all();
  const [contact] = db
    .select()
    .from(customerContacts)
    .where(and(eq(customerContacts.id, Number(contactId)), eq(customerContacts.customerId, customerId)))
    .all();
  if (!customer || !contact) notFound();

  return (
    <>
      <PageHeader title={`Edit contact — ${contact.name}`} />
      <ContactForm
        action={saveContact.bind(null, customerId, contact.id)}
        initial={contact}
        cancelHref={`/customers/${customerId}`}
      />
    </>
  );
}
