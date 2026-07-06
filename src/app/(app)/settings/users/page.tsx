import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { formatDateTime, titleCase } from "@/lib/format";
import { PageHeader, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function UsersPage() {
  const actor = await requireUser();
  assertCan(actor, "users:manage");

  const rows = db.select().from(users).orderBy(asc(users.name)).all();

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Internal user accounts and roles"
        actions={<LinkButton href="/settings/users/new" variant="primary">New user</LinkButton>}
      />
      <DataTable
        filename="staff"
        columns={[
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "role", header: "Role" },
          { key: "active", header: "Active" },
          { key: "created", header: "Created" },
        ]}
        rows={rows.map((u) => ({
          href: `/settings/users/${u.id}/edit`,
          cells: {
            name: u.name,
            email: u.email,
            role: titleCase(u.role),
            active: { text: u.active ? "Active" : "Inactive", badge: u.active ? "green" : "slate" },
            created: { text: formatDateTime(u.createdAt), sort: u.createdAt },
          },
        }))}
      />
    </>
  );
}
