import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { formatDateTime, titleCase } from "@/lib/format";
import { isScaleBookLoaded } from "@/lib/scale-book";
import { PageHeader, Section, LinkButton } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { loadTestBook, removeTestBook } from "./testBookActions";

// Loading the test book inserts ~75k rows in one go — give the server action
// room to finish on Vercel.
export const maxDuration = 60;

export default async function UsersPage() {
  const actor = await requireUser();
  assertCan(actor, "users:manage");

  const rows = await db.select().from(users).orderBy(asc(users.name));
  const testBookLoaded = await isScaleBookLoaded();

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
      <div className="mt-8">
        <Section title="Test data">
          <div className="card p-4">
            <p className="text-sm text-slate-600">
              A generated book of ~1,600 fake deals (contracts YGG51650–YGG53249, ~780 customers,
              full ledgers, arrears and collections workflows) for trying the RMS at real
              portfolio size. Loading takes up to a minute; removing it deletes only the fake
              records — everything you entered yourself stays.
            </p>
            <div className="mt-3 flex items-center gap-3">
              {testBookLoaded ? (
                <>
                  <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Test book loaded
                  </span>
                  <form action={removeTestBook}>
                    <button type="submit" className="btn-secondary text-xs">
                      Remove test book
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Not loaded
                  </span>
                  <form action={loadTestBook}>
                    <button type="submit" className="btn-secondary text-xs">
                      Load test book (1,600 deals)
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
