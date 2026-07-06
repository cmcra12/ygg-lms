import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { PolicyForm } from "../PolicyForm";
import { savePolicy } from "../../../actions";

export default async function NewPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customerId = Number(id);
  const [customer] = db.select().from(customers).where(eq(customers.id, customerId)).all();
  if (!customer) notFound();

  return (
    <>
      <PageHeader title={`New insurance policy — ${customer.name}`} />
      <PolicyForm
        action={savePolicy.bind(null, customerId, null)}
        cancelHref={`/customers/${customerId}`}
      />
    </>
  );
}
