import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../CustomerForm";
import { saveCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="New customer" />
      <CustomerForm action={saveCustomer.bind(null, null)} cancelHref="/customers" />
    </>
  );
}
