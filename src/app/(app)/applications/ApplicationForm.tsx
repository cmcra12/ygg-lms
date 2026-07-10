"use client";

import { useState } from "react";
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

function SectionHeading({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="sm:col-span-2 border-b border-slate-200 pb-1 pt-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ygg-600">{children}</h2>
      {hint && <p className="mt-0.5 text-xs font-normal normal-case text-slate-400">{hint}</p>}
    </div>
  );
}

function Text({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="field-input"
      />
    </div>
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
  // Existing customers already have their business details on file, so the
  // full YGG0094 business-information section only shows for a new customer.
  const hasBusinessInfo = !!(
    initial.tradingName ||
    initial.entityType ||
    initial.natureOfBusiness ||
    initial.businessAddressLine1
  );
  const [mode, setMode] = useState<"existing" | "new">(hasBusinessInfo ? "new" : "existing");

  return (
    <FormFrame action={action} submitLabel="Save application" cancelHref={cancelHref} maxWidth="max-w-5xl">
      {/* Existing vs new customer — segmented control */}
      <div>
        <span className="field-label">This application is for</span>
        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
          {(
            [
              ["existing", "An existing customer"],
              ["new", "A new customer"],
            ] as const
          ).map(([value, labelText]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {mode === "existing"
            ? "We already hold this customer's business details, so just capture the deal."
            : "Capture the customer's full business information from the application form."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <SectionHeading>Application</SectionHeading>
        <div>
          <label className="field-label">
            Customer <span className="text-red-600">*</span>
          </label>
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

        {mode === "new" && (
          <>
            <SectionHeading hint="From the customer's application form (YGG0094)">
              Business information
            </SectionHeading>
            <Text label="Trading name" name="tradingName" defaultValue={initial.tradingName ?? ""} />
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
            <Text label="Full name of trustee" name="trusteeName" defaultValue={initial.trusteeName ?? ""} />
            <Text
              label="Total years trading"
              name="yearsTrading"
              defaultValue={initial.yearsTrading != null ? String(initial.yearsTrading) : ""}
            />
            <Text
              label="Nature of business (e.g. Civil, Mining)"
              name="natureOfBusiness"
              defaultValue={initial.natureOfBusiness ?? ""}
            />
            <Text label="Business phone number" name="businessPhone" defaultValue={initial.businessPhone ?? ""} />
            <Text
              label="Business address"
              name="businessAddressLine1"
              defaultValue={initial.businessAddressLine1 ?? ""}
            />
            <div className="grid grid-cols-3 gap-3">
              <Text label="Suburb" name="businessSuburb" defaultValue={initial.businessSuburb ?? ""} />
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
              <Text label="Postcode" name="businessPostcode" defaultValue={initial.businessPostcode ?? ""} />
            </div>
            <div>
              <label className="field-label">Business premises</label>
              <select name="premises" defaultValue={initial.premises ?? ""} className="field-input">
                <option value="">— Select —</option>
                <option value="rent">Rent</option>
                <option value="own">Own</option>
              </select>
            </div>
            <Text
              label="Employees in business"
              name="employeesCount"
              defaultValue={initial.employeesCount != null ? String(initial.employeesCount) : ""}
            />
            <Text
              label="Machines in fleet"
              name="machinesInFleet"
              defaultValue={initial.machinesInFleet != null ? String(initial.machinesInFleet) : ""}
            />
          </>
        )}

        <SectionHeading hint="RR and ROI come from YGG's quote tool">Deal</SectionHeading>
        <Text
          label="Amount required ex GST ($)"
          name="dealValue"
          defaultValue={initial.dealValueExGstCents != null ? (initial.dealValueExGstCents / 100).toFixed(2) : ""}
        />
        <Text
          label="Brokerage ex GST ($)"
          name="brokerage"
          defaultValue={initial.brokerageExGstCents != null ? (initial.brokerageExGstCents / 100).toFixed(2) : ""}
        />
        <Text
          label="Rental rate — RR (%)"
          name="rentalRatePercent"
          defaultValue={initial.rentalRatePercent ?? "5.00"}
        />
        <div>
          <label className="field-label">ROI (%)</label>
          <input name="roiPercent" defaultValue={initial.roiPercent ?? ""} placeholder="typically 21–27%" className="field-input" />
        </div>
        <Text
          label="Minimum return (months)"
          name="termMonths"
          defaultValue={initial.termMonths != null ? String(initial.termMonths) : "12"}
        />

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
