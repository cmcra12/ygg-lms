import { eq } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "./index";
import { auditLog } from "./schema";

// Central audited mutation layer. Every create/update/delete on every business
// table goes through these three functions — they write the row and its
// audit_log entry in one transaction, so no screen can bypass the audit trail.
// Do not call db.insert/update/delete on business tables anywhere else.

export type Actor = { id: number | null; name: string };

type AnyRow = Record<string, unknown>;

function idColumn(table: SQLiteTable) {
  const col = (table as unknown as { id?: unknown }).id;
  if (!col) throw new Error("Audited tables must have an `id` column");
  return col as Parameters<typeof eq>[0];
}

function writeAudit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actor: Actor,
  entityType: string,
  entityId: number,
  action: "create" | "update" | "delete",
  before: AnyRow | null,
  after: AnyRow | null,
) {
  tx.insert(auditLog)
    .values({
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      entityType,
      entityId,
      action,
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null,
    })
    .run();
}

export function auditedInsert<T extends AnyRow>(
  actor: Actor,
  table: SQLiteTable,
  entityType: string,
  values: AnyRow,
): T {
  return db.transaction((tx) => {
    const [row] = tx.insert(table).values(values).returning().all() as T[];
    writeAudit(tx, actor, entityType, (row as AnyRow).id as number, "create", null, row);
    return row;
  });
}

export function auditedUpdate<T extends AnyRow>(
  actor: Actor,
  table: SQLiteTable,
  entityType: string,
  id: number,
  values: AnyRow,
): T {
  return db.transaction((tx) => {
    const [before] = tx.select().from(table).where(eq(idColumn(table), id)).all() as T[];
    if (!before) throw new Error(`${entityType} #${id} not found`);
    const [after] = tx
      .update(table)
      .set(values)
      .where(eq(idColumn(table), id))
      .returning()
      .all() as T[];
    writeAudit(tx, actor, entityType, id, "update", before, after);
    return after;
  });
}

export function auditedDelete(
  actor: Actor,
  table: SQLiteTable,
  entityType: string,
  id: number,
): void {
  db.transaction((tx) => {
    const [before] = tx.select().from(table).where(eq(idColumn(table), id)).all() as AnyRow[];
    if (!before) throw new Error(`${entityType} #${id} not found`);
    tx.delete(table).where(eq(idColumn(table), id)).run();
    writeAudit(tx, actor, entityType, id, "delete", before, null);
  });
}
