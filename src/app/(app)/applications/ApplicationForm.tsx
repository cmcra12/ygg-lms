"use client";

import { FormFrame, type ActionState } from "@/components/FormFrame";

type ApplicationValues = {
  customerId?: number;
  status?: string;
  source?: string;
  brokerId?: number | null;
  ownerId?: number | null;
  dealValueExGstCents?: number | null;
  rentalRatePercent?: string | null;
  roiPercent?: string | null;
  termMonths?: number | null;
  brokerageExGstCents?: number | null;
  notes?: string | null;
};

export function ApplicationForm({
  action,
  initial = {},
  customers,
  brokers,
  owners,
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ApplicationValues;
  customers: Array<{ id: number; name: string }>;
  brokers: Array<{ id: number; name: string }>;
  owners: Array<{ id: number; name: string }>;
  cancelHref: string;
}) {
  return (
    <FormFrame action={action} submitLabel="Save application" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Customer *</label>
          <select
            name="customerId"
            required
            defaultValue={initial.customerId != null ? String(initial.customerId) : ""}
            className="field-input"
          >
            <option value="">— Select —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Status</label>
          <select name="status" defaultValue={initial.status ?? "draft"} className="field-input">
            <option value="draft">Draft</option>
            <option value="in_progress">In progress</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        <div>
          <label className="field-label">Source</label>
          <select name="source" defaultValue={initial.source ?? "broker"} className="field-input">
            <option value="broker">Broker</option>
            <option value="direct">Direct</option>
            <option value="referrer">Referrer</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>
        <div>
          <label className="field-label">Broker</label>
          <select
            name="brokerId"
            defaultValue={initial.brokerId != null ? String(initial.brokerId) : ""}
            className="field-input"
          >
            <option value="">— None —</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Owner</label>
          <select
            name="ownerId"
            defaultValue={initial.ownerId != null ? String(initial.ownerId) : ""}
            className="field-input"
          >
            <option value="">— Me —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Deal value ex GST ($)</label>
          <input
            name="dealValue"
            defaultValue={
              initial.dealValueExGstCents != null ? (initial.dealValueExGstCents / 100).toFixed(2) : ""
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Rental rate — RR (% — from quote tool)</label>
          <input name="rentalRatePercent" defaultValue={initial.rentalRatePercent ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">ROI (% — from quote tool)</label>
          <input name="roiPercent" defaultValue={initial.roiPercent ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Term (months)</label>
          <input
            name="termMonths"
            defaultValue={initial.termMonths != null ? String(initial.termMonths) : ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Brokerage ex GST ($)</label>
          <input
            name="brokerage"
            defaultValue={
              initial.brokerageExGstCents != null ? (initial.brokerageExGstCents / 100).toFixed(2) : ""
            }
            className="field-input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={3} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
