import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../../UserForm";
import { saveUser } from "../../actions";

export default async function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const actor = await requireUser();
  assertCan(actor, "users:manage");

  const { userId } = await params;
  const [user] = db.select().from(users).where(eq(users.id, Number(userId))).all();
  if (!user) notFound();

  return (
    <>
      <PageHeader title={`Edit ${user.name}`} />
      <UserForm
        action={saveUser.bind(null, user.id)}
        initial={user}
        isNew={false}
        cancelHref="/settings/users"
      />
    </>
  );
}
