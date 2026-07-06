export type Role = "admin" | "credit" | "operations";

export type Permission =
  | "records:write" // create/edit business records
  | "records:delete" // hard-delete records
  | "users:manage" // manage staff accounts
  | "audit:view"; // view the audit log

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["records:write", "records:delete", "users:manage", "audit:view"],
  credit: ["records:write", "audit:view"],
  operations: ["records:write", "audit:view"],
};

export function can(user: { role: Role }, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function assertCan(user: { role: Role }, permission: Permission): void {
  if (!can(user, permission)) {
    throw new Error(`Your role (${user.role}) does not allow this action (${permission}).`);
  }
}
