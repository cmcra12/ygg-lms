import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../../CustomerForm";
import { saveCustomer } from "../../actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId));
  if (!customer) notFound();

  return (
    <>
      <PageHeader title={`Edit ${customer.code} — ${customer.name}`} />
      <CustomerForm
        action={saveCustomer.bind(null, customerId)}
        initial={customer}
        cancelHref={`/customers/${customerId}`}
      />
    </>
  );
}
