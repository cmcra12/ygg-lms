import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../UserForm";
import { saveUser } from "../actions";

export default async function NewUserPage() {
  const actor = await requireUser();
  assertCan(actor, "users:manage");

  return (
    <>
      <PageHeader title="New user" />
      <UserForm action={saveUser.bind(null, null)} isNew cancelHref="/settings/users" />
    </>
  );
}
