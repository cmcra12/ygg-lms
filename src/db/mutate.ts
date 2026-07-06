import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "./index";
import { auditLog } from "./schema";

// Central audited mutation layer. Every create/update/delete on every business
// table goes through these three functions — they write the row and its
// audit_log entry in one transaction, so no screen can bypass the audit trail.
// Do not call db.insert/update/delete on business tables anywhere else.

export type Actor = { id: number | null; name: string };

type AnyRow = Record<string, unknown>;

function idColumn(table: PgTable) {
  const col = (table as unknown as { id?: unknown }).id;
  if (!col) throw new Error("Audited tables must have an `id` column");
  return col as Parameters<typeof eq>[0];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function writeAudit(
  tx: Tx,
  actor: Actor,
  entityType: string,
  entityId: number,
  action: "create" | "update" | "delete",
  before: AnyRow | null,
  after: AnyRow | null,
) {
  await tx.insert(auditLog).values({
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    entityType,
    entityId,
    action,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
  });
}

export async function auditedInsert<T extends AnyRow>(
  actor: Actor,
  table: PgTable,
  entityType: string,
  values: AnyRow,
): Promise<T> {
  return db.transaction(async (tx) => {
    const [row] = (await tx.insert(table).values(values).returning()) as T[];
    await writeAudit(tx, actor, entityType, (row as AnyRow).id as number, "create", null, row);
    return row;
  });
}

export async function auditedUpdate<T extends AnyRow>(
  actor: Actor,
  table: PgTable,
  entityType: string,
  id: number,
  values: AnyRow,
): Promise<T> {
  return db.transaction(async (tx) => {
    const [before] = (await tx.select().from(table).where(eq(idColumn(table), id))) as T[];
    if (!before) throw new Error(`${entityType} #${id} not found`);
    const [after] = (await tx
      .update(table)
      .set(values)
      .where(eq(idColumn(table), id))
      .returning()) as T[];
    await writeAudit(tx, actor, entityType, id, "update", before, after);
    return after;
  });
}

export async function auditedDelete(
  actor: Actor,
  table: PgTable,
  entityType: string,
  id: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = (await tx.select().from(table).where(eq(idColumn(table), id))) as AnyRow[];
    if (!before) throw new Error(`${entityType} #${id} not found`);
    await tx.delete(table).where(eq(idColumn(table), id));
    await writeAudit(tx, actor, entityType, id, "delete", before, null);
  });
}
