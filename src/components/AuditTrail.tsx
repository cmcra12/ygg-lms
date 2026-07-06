import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { formatDateTime, titleCase } from "@/lib/format";
import { Section } from "./ui";

function changedFields(beforeJson: string | null, afterJson: string | null): string {
  if (!beforeJson || !afterJson) return "";
  const before = JSON.parse(beforeJson) as Record<string, unknown>;
  const after = JSON.parse(afterJson) as Record<string, unknown>;
  const changed = Object.keys(after).filter(
    (k) => k !== "updatedAt" && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  return changed
    .map((k) => `${titleCase(k.replace(/([A-Z])/g, "_$1").toLowerCase())}: ${before[k] ?? "—"} → ${after[k] ?? "—"}`)
    .join("; ");
}

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

/** Per-entity audit history, shown on detail screens. */
export async function AuditTrail({ entityType, entityId }: { entityType: string; entityId: number }) {
  const entries = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
    .orderBy(desc(auditLog.id))
    .limit(50)
    ;

  if (entries.length === 0) return null;

  return (
    <Section title="Audit trail">
      <div className="card divide-y divide-slate-100">
        {entries.map((e) => (
          <div key={e.id} className="flex items-baseline gap-3 px-4 py-2 text-sm">
            <span className="w-36 shrink-0 tabular-nums text-slate-500">
              {formatDateTime(e.timestamp)}
            </span>
            <span className="shrink-0 font-medium">{ACTION_LABEL[e.action]}</span>
            <span className="shrink-0 text-slate-500">by {e.actorName}</span>
            <span className="truncate text-slate-500">{changedFields(e.before, e.after)}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}
