"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type UserValues = {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
};

export function UserForm({
  action,
  initial = {},
  isNew,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: UserValues;
  isNew: boolean;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save user" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Name *</label>
          <input name="name" required defaultValue={initial.name ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email *</label>
          <input name="email" type="email" required defaultValue={initial.email ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Role *</label>
          <select name="role" defaultValue={initial.role ?? "operations"} className="field-input">
            <option value="admin">Admin</option>
            <option value="credit">Credit</option>
            <option value="operations">Operations</option>
          </select>
        </div>
        <div>
          <label className="field-label">{isNew ? "Password *" : "New password (leave blank to keep)"}</label>
          <input
            name="password"
            type="password"
            required={isNew}
            minLength={8}
            className="field-input"
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="active"
            name="active"
            type="checkbox"
            defaultChecked={initial.active ?? true}
            className="h-4 w-4 accent-amber-500"
          />
          <label htmlFor="active" className="text-sm text-slate-700">
            Active (can sign in)
          </label>
        </div>
      </div>
    </FormFrame>
  );
}
