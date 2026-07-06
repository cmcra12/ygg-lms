import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { ContactForm } from "../ContactForm";
import { saveContact } from "../../../actions";

export default async function NewContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = db.select().from(customers).where(eq(customers.id, customerId)).all();
  if (!customer) notFound();

  return (
    <>
      <PageHeader title={`New contact — ${customer.name}`} />
      <ContactForm
        action={saveContact.bind(null, customerId, null)}
        cancelHref={`/customers/${customerId}`}
      />
    </>
  );
}
