"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workflowItems, workflows } from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { requireUser, type SessionUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { WORKFLOW_TEMPLATES } from "@/lib/workflows";

// Opens a workflow instance from a template and copies its steps.
export async function openWorkflow(
  templateKey: string,
  entityType: "application" | "account",
  entityId: number,
  revalidate: string,
): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  await openWorkflowAs(user, templateKey, entityType, entityId);
  revalidatePath(revalidate);
}

/** Shared with saveApplication, which auto-opens the Origination workflow. */
export async function openWorkflowAs(
  user: SessionUser,
  templateKey: string,
  entityType: "application" | "account",
  entityId: number,
): Promise<void> {
  const template = WORKFLOW_TEMPLATES[templateKey];
  if (!template || template.appliesTo !== entityType) throw new Error("Unknown workflow template");

  const workflow = await auditedInsert<{ id: number }>(user, workflows, "workflow", {
    templateKey,
    description: template.name,
    entityType,
    entityId,
    status: "open",
    allocatedTo: user.id,
    openedBy: user.id,
    openedAt: new Date().toISOString(),
  });
  for (const [i, step] of template.steps.entries()) {
    await auditedInsert(user, workflowItems, "workflow_item", {
      workflowId: workflow.id,
      position: i + 1,
      key: step.key,
      label: step.label,
      kind: step.kind,
      note: step.note ?? null,
      status: "pending",
    });
  }
}

async function refreshWorkflowStatus(user: SessionUser, workflowId: number): Promise<void> {
  const items = await db
    .select()
    .from(workflowItems)
    .where(eq(workflowItems.workflowId, workflowId));
  const allDone = items.every((i) => i.status !== "pending");
  const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
  if (!workflow) return;
  if (allDone && workflow.status === "open") {
    await auditedUpdate(user, workflows, "workflow", workflowId, {
      status: "complete",
      completedAt: new Date().toISOString(),
    });
  } else if (!allDone && workflow.status === "complete") {
    await auditedUpdate(user, workflows, "workflow", workflowId, {
      status: "open",
      completedAt: null,
    });
  }
}

export async function actionWorkflowItem(
  workflowId: number,
  itemId: number,
  revalidate: string,
): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const [item] = await db
    .select()
    .from(workflowItems)
    .where(and(eq(workflowItems.id, itemId), eq(workflowItems.workflowId, workflowId)));
  if (!item) return;
  await auditedUpdate(user, workflowItems, "workflow_item", itemId, {
    status: "done",
    actionedBy: user.id,
    actionedAt: new Date().toISOString(),
  });
  await refreshWorkflowStatus(user, workflowId);
  revalidatePath(revalidate);
}

export async function skipWorkflowItem(
  workflowId: number,
  itemId: number,
  revalidate: string,
): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  await auditedUpdate(user, workflowItems, "workflow_item", itemId, {
    status: "skipped",
    actionedBy: user.id,
    actionedAt: new Date().toISOString(),
  });
  await refreshWorkflowStatus(user, workflowId);
  revalidatePath(revalidate);
}

export async function reopenWorkflowItem(
  workflowId: number,
  itemId: number,
  revalidate: string,
): Promise<void> {
  const user = await requireUser();
  assertCan(user, "records:write");
  await auditedUpdate(user, workflowItems, "workflow_item", itemId, {
    status: "pending",
    actionedBy: null,
    actionedAt: null,
  });
  await refreshWorkflowStatus(user, workflowId);
  revalidatePath(revalidate);
}

/** Loads workflows plus items for an entity, oldest first. */
export async function loadWorkflows(entityType: "application" | "account", entityId: number) {
  const instances = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.entityType, entityType), eq(workflows.entityId, entityId)))
    .orderBy(asc(workflows.id));
  const result = [];
  for (const workflow of instances) {
    const items = await db
      .select()
      .from(workflowItems)
      .where(eq(workflowItems.workflowId, workflow.id))
      .orderBy(asc(workflowItems.position));
    result.push({ workflow, items });
  }
  return result;
}
