import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, insurancePolicies } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { PolicyForm } from "../../PolicyForm";
import { savePolicy } from "../../../../actions";

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string; policyId: string }>;
}) {
  const { id, policyId } = await params;
  const customerId = Number(id);
  const [customer] = db.select().from(customers).where(eq(customers.id, customerId)).all();
  const [policy] = db
    .select()
    .from(insurancePolicies)
    .where(and(eq(insurancePolicies.id, Number(policyId)), eq(insurancePolicies.customerId, customerId)))
    .all();
  if (!customer || !policy) notFound();

  return (
    <>
      <PageHeader title={`Edit policy ${policy.policyNumber} — ${customer.name}`} />
      <PolicyForm
        action={savePolicy.bind(null, customerId, policy.id)}
        initial={policy}
        cancelHref={`/customers/${customerId}`}
      />
    </>
  );
}
