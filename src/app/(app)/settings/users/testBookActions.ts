"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import {
  generateScaleBook,
  insertScaleBook,
  isScaleBookLoaded,
  removeScaleBook,
} from "@/lib/scale-book";

// Admin-only: load/remove the ~1,600-deal test book straight into the live
// database. This replaces pasting SQL into Supabase (whose SQL Editor rejects
// anything this size).

export async function loadTestBook(): Promise<void> {
  const user = await requireUser();
  assertCan(user, "users:manage");
  if (await isScaleBookLoaded()) return; // already there — nothing to do
  const book = generateScaleBook();
  await insertScaleBook(book);
  revalidatePath("/", "layout");
}

export async function removeTestBook(): Promise<void> {
  const user = await requireUser();
  assertCan(user, "users:manage");
  await removeScaleBook();
  revalidatePath("/", "layout");
}
