"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type CustomerValues = {
  name?: string;
  type?: string;
  abn?: string | null;
  acn?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  status?: string;
  notes?: string | null;
};

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

export function CustomerForm({
  action,
  initial = {},
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CustomerValues;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save customer" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Name *</label>
          <input name="name" required defaultValue={initial.name ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Type *</label>
          <select name="type" defaultValue={initial.type ?? "company"} className="field-input">
            <option value="company">Company</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={initial.status ?? "active"} className="field-input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="field-label">ABN (companies)</label>
          <input name="abn" defaultValue={initial.abn ?? ""} className="field-input" placeholder="11 digits" />
        </div>
        <div>
          <label className="field-label">ACN</label>
          <input name="acn" defaultValue={initial.acn ?? ""} className="field-input" placeholder="9 digits" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" defaultValue={initial.email ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input name="phone" defaultValue={initial.phone ?? ""} className="field-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Address line 1</label>
          <input name="addressLine1" defaultValue={initial.addressLine1 ?? ""} className="field-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Address line 2</label>
          <input name="addressLine2" defaultValue={initial.addressLine2 ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Suburb</label>
          <input name="suburb" defaultValue={initial.suburb ?? ""} className="field-input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">State</label>
            <select name="state" defaultValue={initial.state ?? "NSW"} className="field-input">
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Postcode</label>
            <input name="postcode" defaultValue={initial.postcode ?? ""} className="field-input" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={3} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
