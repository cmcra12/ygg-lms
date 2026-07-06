"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auditedInsert, auditedUpdate } from "@/db/mutate";
import { hashPassword, requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import type { ActionState } from "@/components/FormFrame";

export async function saveUser(
  userId: number | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireUser();
  assertCan(actor, "users:manage");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Name and email are required." };
  if (!["admin", "credit", "operations"].includes(role)) return { error: "Invalid role." };
  if (userId == null && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing && existing.id !== userId) return { error: "A user with that email already exists." };

  if (actor.id === userId && role !== "admin") {
    return { error: "You cannot remove your own admin role." };
  }

  const active = formData.get("active") === "on";
  if (!active && actor.id === userId) {
    return { error: "You cannot deactivate your own account." };
  }

  const values: Record<string, unknown> = { name, email, role, active };
  // The audit log captures the bcrypt hash on password changes — never plaintext.
  if (password) values.passwordHash = hashPassword(password);

  if (userId == null) {
    await auditedInsert(actor, users, "user", { ...values, createdAt: new Date().toISOString() });
  } else {
    await auditedUpdate(actor, users, "user", userId, values);
  }
  revalidatePath("/settings/users");
  redirect("/settings/users");
}
