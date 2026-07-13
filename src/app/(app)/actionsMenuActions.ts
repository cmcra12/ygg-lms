"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers, loans, transactions, workflowItems, workflows } from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { parseMoneyToCents } from "@/lib/format";
import { workflowCode } from "@/lib/workflows";

// Server actions behind the global Actions menu: quick payments and workflow
// overrides from anywhere in the app.

export type AccountHit = {
  loanId: number;
  contractNumber: string;
  customerName: string;
  status: string;
};

/** Type-ahead account lookup by contract number or customer name. */
export async function searchAccountsForActions(query: string): Promise<AccountHit[]> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const rows = await db
    .select({ loan: loans, customer: customers })
    .from(loans)
    .innerJoin(customers, eq(loans.customerId, customers.id))
    .where(or(ilike(loans.contractNumber, like), ilike(customers.name, like)))
    .orderBy(desc(loans.id))
    .limit(8);
  return rows.map(({ loan, customer }) => ({
    loanId: loan.id,
    contractNumber: loan.contractNumber,
    customerName: customer.name,
    status: loan.status,
  }));
}

const TXN_SIGN: Record<string, 1 | -1> = {
  payment: -1, // money in reduces the balance
  charge: 1,
  dishonour_fee: 1,
  adjustment: 1,
};

export type RecordPaymentResult = { ok: boolean; message: string; loanId?: number };

export async function recordTransaction(input: {
  loanId: number;
  type: "payment" | "charge" | "dishonour_fee" | "adjustment";
  amount: string;
  date: string;
  description: string;
  reference?: string;
}): Promise<RecordPaymentResult> {
  const user = await requireUser();
  assertCan(user, "records:write");

  const [loan] = await db.select().from(loans).where(eq(loans.id, input.loanId));
  if (!loan) return { ok: false, message: "Account not found." };

  const magnitude = parseMoneyToCents(input.amount);
  if (magnitude == null || magnitude <= 0) return { ok: false, message: "Enter a dollar amount." };
  const sign = TXN_SIGN[input.type] ?? 1;
  const exGst = magnitude * sign;
  const date = input.date || new Date().toISOString().slice(0, 10);

  await auditedInsert(user, transactions, "transaction", {
    loanId: loan.id,
    date,
    type: input.type,
    amountExGstCents: exGst,
    gstCents: Math.round(exGst * 0.1),
    source: "manual",
    reference: input.reference?.trim() || `${loan.contractNumber}-M`,
    description: input.description.trim() || null,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/accounts/${loan.id}`);
  revalidatePath(`/collections/${loan.id}`);
  revalidatePath("/");
  return {
    ok: true,
    message: `Recorded on ${loan.contractNumber}.`,
    loanId: loan.id,
  };
}

export type OpenWorkflowHit = {
  id: number;
  code: string;
  description: string;
  entityType: string;
  entityId: number;
  label: string;
};

/** Open workflows across the book, newest first, for the override picker. */
export async function loadOpenWorkflowsForActions(): Promise<OpenWorkflowHit[]> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const open = await db
    .select()
    .from(workflows)
    .where(eq(workflows.status, "open"))
    .orderBy(desc(workflows.id))
    .limit(50);

  const hits: OpenWorkflowHit[] = [];
  for (const w of open) {
    let label = `#${w.entityId}`;
    if (w.entityType === "account") {
      const [loan] = await db.select().from(loans).where(eq(loans.id, w.entityId));
      if (loan) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, loan.customerId));
        label = `${loan.contractNumber} · ${customer?.name ?? ""}`;
      }
    } else {
      const { applications } = await import("@/db/schema");
      const [app] = await db.select().from(applications).where(eq(applications.id, w.entityId));
      if (app) label = app.reference;
    }
    hits.push({
      id: w.id,
      code: workflowCode(w.id),
      description: w.description,
      entityType: w.entityType,
      entityId: w.entityId,
      label,
    });
  }
  return hits;
}

export type OverrideResult = { ok: boolean; message: string };

/** Force a workflow to complete or cancel, actioning any pending items. */
export async function overrideWorkflow(
  workflowId: number,
  mode: "complete" | "cancel",
): Promise<OverrideResult> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
  if (!workflow) return { ok: false, message: "Workflow not found." };
  if (workflow.status !== "open") return { ok: false, message: "That workflow is already closed." };

  const items = await db
    .select()
    .from(workflowItems)
    .where(and(eq(workflowItems.workflowId, workflowId), eq(workflowItems.status, "pending")));
  const now = new Date().toISOString();
  for (const item of items) {
    await auditedUpdate(user, workflowItems, "workflow_item", item.id, {
      status: mode === "complete" ? "done" : "skipped",
      actionedBy: user.id,
      actionedAt: now,
    });
  }
  await auditedUpdate(user, workflows, "workflow", workflowId, {
    status: mode === "complete" ? "complete" : "cancelled",
    completedAt: now,
  });

  const entityPath =
    workflow.entityType === "account" ? `/accounts/${workflow.entityId}` : `/applications/${workflow.entityId}`;
  revalidatePath(entityPath);
  revalidatePath(`/collections/${workflow.entityId}`);
  revalidatePath("/");
  return {
    ok: true,
    message: `${workflowCode(workflowId)} ${mode === "complete" ? "completed" : "cancelled"}.`,
  };
}
