"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type AssetValues = {
  description?: string;
  category?: string | null;
  vin?: string | null;
  rego?: string | null;
  serialNumber?: string | null;
  valueExGstCents?: number | null;
  status?: string;
  customerId?: number | null;
  loanId?: number | null;
  notes?: string | null;
};

export function AssetForm({
  action,
  initial = {},
  customers,
  loans,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: AssetValues;
  customers: Array<{ id: number; name: string }>;
  loans: Array<{ id: number; contractNumber: string; customerName: string }>;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save asset" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Description *</label>
          <input name="description" required defaultValue={initial.description ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Category</label>
          <input
            name="category"
            defaultValue={initial.category ?? ""}
            className="field-input"
            placeholder="e.g. Excavator, Prime Mover"
          />
        </div>
        <div>
          <label className="field-label">Value ex GST ($)</label>
          <input
            name="value"
            defaultValue={initial.valueExGstCents != null ? (initial.valueExGstCents / 100).toFixed(2) : ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">VIN</label>
          <input name="vin" defaultValue={initial.vin ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Rego</label>
          <input name="rego" defaultValue={initial.rego ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Serial number</label>
          <input name="serialNumber" defaultValue={initial.serialNumber ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={initial.status ?? "active"} className="field-input">
            <option value="active">Active</option>
            <option value="paid_out">Paid out</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div>
          <label className="field-label">Current customer</label>
          <select
            name="customerId"
            defaultValue={initial.customerId != null ? String(initial.customerId) : ""}
            className="field-input"
          >
            <option value="">— None —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Current loan</label>
          <select
            name="loanId"
            defaultValue={initial.loanId != null ? String(initial.loanId) : ""}
            className="field-input"
          >
            <option value="">— None —</option>
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.contractNumber} — {l.customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
