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
  tradingName?: string | null;
  entityType?: string | null;
  trusteeType?: string | null;
  trusteeName?: string | null;
  yearsTrading?: number | null;
  natureOfBusiness?: string | null;
  businessPhone?: string | null;
  businessAddressLine1?: string | null;
  businessSuburb?: string | null;
  businessState?: string | null;
  businessPostcode?: string | null;
  premises?: string | null;
  employeesCount?: number | null;
  machinesInFleet?: number | null;
  notes?: string | null;
};

const STATES = ["", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="sm:col-span-2 border-b border-slate-200 pb-1 pt-2 text-sm font-bold uppercase tracking-wide text-ygg-600">
      {children}
    </h2>
  );
}

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
        <SectionHeading>Business information</SectionHeading>
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
          <label className="field-label">Trading name</label>
          <input name="tradingName" defaultValue={initial.tradingName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Amount required ex GST ($)</label>
          <input
            name="dealValue"
            defaultValue={
              initial.dealValueExGstCents != null ? (initial.dealValueExGstCents / 100).toFixed(2) : ""
            }
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Entity type</label>
          <select name="entityType" defaultValue={initial.entityType ?? ""} className="field-input">
            <option value="">— Select —</option>
            <option value="pty_ltd">Pty Ltd</option>
            <option value="limited">Limited</option>
            <option value="sole_trader">Sole Trader</option>
            <option value="trust">Trust</option>
            <option value="partnership">Partnership</option>
          </select>
        </div>
        <div>
          <label className="field-label">Type of trustee (if trust)</label>
          <select name="trusteeType" defaultValue={initial.trusteeType ?? ""} className="field-input">
            <option value="">— N/A —</option>
            <option value="company">Company</option>
            <option value="individual">Individual</option>
          </select>
        </div>
        <div>
          <label className="field-label">Full name of trustee</label>
          <input name="trusteeName" defaultValue={initial.trusteeName ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Total years trading</label>
          <input
            name="yearsTrading"
            defaultValue={initial.yearsTrading != null ? String(initial.yearsTrading) : ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Nature of business (e.g. Civil, Mining)</label>
          <input name="natureOfBusiness" defaultValue={initial.natureOfBusiness ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Business phone number</label>
          <input name="businessPhone" defaultValue={initial.businessPhone ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Business address</label>
          <input
            name="businessAddressLine1"
            defaultValue={initial.businessAddressLine1 ?? ""}
            className="field-input"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">Suburb</label>
            <input name="businessSuburb" defaultValue={initial.businessSuburb ?? ""} className="field-input" />
          </div>
          <div>
            <label className="field-label">State</label>
            <select name="businessState" defaultValue={initial.businessState ?? ""} className="field-input">
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s || "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Postcode</label>
            <input name="businessPostcode" defaultValue={initial.businessPostcode ?? ""} className="field-input" />
          </div>
        </div>
        <div>
          <label className="field-label">Business premises</label>
          <select name="premises" defaultValue={initial.premises ?? ""} className="field-input">
            <option value="">— Select —</option>
            <option value="rent">Rent</option>
            <option value="own">Own</option>
          </select>
        </div>
        <div>
          <label className="field-label">Employees in business</label>
          <input
            name="employeesCount"
            defaultValue={initial.employeesCount != null ? String(initial.employeesCount) : ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Machines in fleet</label>
          <input
            name="machinesInFleet"
            defaultValue={initial.machinesInFleet != null ? String(initial.machinesInFleet) : ""}
            className="field-input"
          />
        </div>

        <SectionHeading>Deal &amp; processing</SectionHeading>
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
          <label className="field-label">Rental rate — RR (% — from quote tool)</label>
          <input name="rentalRatePercent" defaultValue={initial.rentalRatePercent ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">ROI (% — from quote tool)</label>
          <input name="roiPercent" defaultValue={initial.roiPercent ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Minimum return (months)</label>
          <input
            name="termMonths"
            defaultValue={initial.termMonths != null ? String(initial.termMonths) : "12"}
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
      <p className="text-xs text-slate-500">
        Applicant 1 / Applicant 2 details and their assets &amp; liabilities statements are added on
        the application&apos;s Applicants tab after saving.
      </p>
    </FormFrame>
  );
}
