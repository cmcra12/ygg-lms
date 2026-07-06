"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type PolicyValues = {
  insurer?: string;
  policyNumber?: string;
  expiryDate?: string;
  status?: string;
  notes?: string | null;
};

export function PolicyForm({
  action,
  initial = {},
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: PolicyValues;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save policy" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Insurer *</label>
          <input name="insurer" required defaultValue={initial.insurer ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Policy number *</label>
          <input name="policyNumber" required defaultValue={initial.policyNumber ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Expiry date *</label>
          <input
            name="expiryDate"
            type="date"
            required
            defaultValue={initial.expiryDate ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={initial.status ?? "current"} className="field-input">
            <option value="current">Current</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes (e.g. covered assets)</label>
          <textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
