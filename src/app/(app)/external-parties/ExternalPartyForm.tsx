"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type PartyValues = {
  type?: string;
  name?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  abn?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  accreditationStatus?: string;
  paidBefore?: boolean;
  aggregatorId?: number | null;
  status?: string;
  notes?: string | null;
};

export function ExternalPartyForm({
  action,
  initial = {},
  aggregators,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: PartyValues;
  aggregators: Array<{ id: number; name: string }>;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save party" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Name *</label>
          <input name="name" required defaultValue={initial.name ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Type *</label>
          <select name="type" defaultValue={initial.type ?? "broker"} className="field-input">
            <option value="broker">Broker</option>
            <option value="vendor">Vendor</option>
            <option value="referrer">Referrer</option>
            <option value="aggregator">Aggregator</option>
          </select>
        </div>
        <div>
          <label className="field-label">Contact name</label>
          <input name="contactName" defaultValue={initial.contactName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">ABN</label>
          <input name="abn" defaultValue={initial.abn ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" defaultValue={initial.email ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input name="phone" defaultValue={initial.phone ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">BSB</label>
          <input name="bsb" defaultValue={initial.bsb ?? ""} className="field-input" placeholder="6 digits" />
        </div>
        <div>
          <label className="field-label">Account number</label>
          <input name="accountNumber" defaultValue={initial.accountNumber ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Account name</label>
          <input name="accountName" defaultValue={initial.accountName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Accreditation</label>
          <select
            name="accreditationStatus"
            defaultValue={initial.accreditationStatus ?? "not_accredited"}
            className="field-input"
          >
            <option value="not_accredited">Not accredited</option>
            <option value="pending">Pending</option>
            <option value="accredited">Accredited</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div>
          <label className="field-label">Aggregator</label>
          <select
            name="aggregatorId"
            defaultValue={initial.aggregatorId != null ? String(initial.aggregatorId) : ""}
            className="field-input"
          >
            <option value="">— None —</option>
            {aggregators.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={initial.status ?? "active"} className="field-input">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="paidBefore"
            name="paidBefore"
            type="checkbox"
            defaultChecked={initial.paidBefore ?? false}
            className="h-4 w-4 accent-ygg-400"
          />
          <label htmlFor="paidBefore" className="text-sm text-slate-700">
            Has been paid before
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
