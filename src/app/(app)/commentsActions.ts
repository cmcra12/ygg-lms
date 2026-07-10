"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { auditedInsert } from "@/db/mutate";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";

export type CommentRow = typeof comments.$inferSelect;

export async function loadComments(entityType: string, entityId: number): Promise<CommentRow[]> {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
    .orderBy(desc(comments.createdAt), desc(comments.id));
}

export async function addComment(
  entityType: string,
  entityId: number,
  body: string,
  revalidate?: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  assertCan(user, "records:write");
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Comment can't be empty." };

  await auditedInsert(user, comments, "comment", {
    entityType,
    entityId,
    body: trimmed,
    authorId: user.id,
    authorName: user.name,
    createdAt: new Date().toISOString(),
  });

  if (revalidate) revalidatePath(revalidate);
  return { ok: true };
}
