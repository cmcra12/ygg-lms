import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { formatDateTime, titleCase } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { DataTable } from "@/components/DataTable";

export default async function AuditLogPage() {
  const user = await requireUser();
  assertCan(user, "audit:view");

  const entries = await db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(1000);

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Immutable record of every create, update and delete (most recent 1,000 shown)"
      />
      <DataTable
        filename="audit-log"
        columns={[
          { key: "when", header: "When" },
          { key: "actor", header: "Actor" },
          { key: "action", header: "Action" },
          { key: "entity", header: "Entity" },
          { key: "detail", header: "Detail" },
        ]}
        rows={entries.map((e) => ({
          cells: {
            when: { text: formatDateTime(e.timestamp), sort: e.timestamp },
            actor: e.actorName,
            action: {
              text: titleCase(e.action),
              badge: e.action === "delete" ? "red" : e.action === "create" ? "green" : "blue",
            },
            entity: `${titleCase(e.entityType)} #${e.entityId}`,
            detail: (e.after ?? e.before ?? "").slice(0, 120),
          },
        }))}
      />
    </>
  );
}
