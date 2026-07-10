"use client";

import { useState } from "react";
import { FormFrame, type ActionState } from "@/components/FormFrame";
import {
  SEARCH_TYPES,
  TITLE_METHODS,
  PPSR_SEARCH_TYPES,
  PPSR_SERIAL_TYPES,
  STATES,
  type SearchType,
  type TitleMethod,
  type PpsrSearchType,
} from "@/lib/searchTypes";

// --- small field helpers ------------------------------------------------------

function Field({
  label,
  name,
  required,
  placeholder,
  type = "text",
  className = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="field-label">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <input name={name} type={type} required={required} placeholder={placeholder} className="field-input" />
    </div>
  );
}

function StateSelect({ label = "State" }: { label?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select name="state" defaultValue="QLD" className="field-input">
        {STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

// --- per-type field sets ------------------------------------------------------

function TitleFields({ initial = "name" }: { initial?: TitleMethod }) {
  const [method, setMethod] = useState<TitleMethod>(initial);
  const [searchBy, setSearchBy] = useState<"name" | "company">("name");
  return (
    <>
      <input type="hidden" name="subtype" value={method} />
      {/* method tabs, per the Equifax titles product */}
      <div className="flex flex-wrap gap-1 border-b border-slate-300">
        {TITLE_METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMethod(m.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              method === m.key
                ? "border border-b-0 border-slate-300 bg-white font-semibold text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StateSelect />
        <div />

        {method === "name" && (
          <>
            <div className="sm:col-span-2 flex items-center gap-4">
              <span className="field-label mb-0">Search by</span>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="searchBy"
                  value="name"
                  checked={searchBy === "name"}
                  onChange={() => setSearchBy("name")}
                />
                Name
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="searchBy"
                  value="company"
                  checked={searchBy === "company"}
                  onChange={() => setSearchBy("company")}
                />
                Company
              </label>
            </div>
            {searchBy === "name" ? (
              <>
                <Field label="First name" name="firstName" required />
                <Field label="Surname" name="surname" required />
              </>
            ) : (
              <Field label="Company" name="company" required className="sm:col-span-2" />
            )}
          </>
        )}

        {method === "title" && (
          <Field label="Title reference" name="titleReference" required placeholder="e.g. 12345678" className="sm:col-span-2" />
        )}

        {method === "address" && (
          <>
            <Field label="Unit / number" name="unit" />
            <Field label="Street number" name="streetNumber" />
            <Field label="Street name" name="streetName" required className="sm:col-span-2" />
            <Field label="Suburb" name="suburb" required />
            <Field label="Postcode" name="postcode" />
          </>
        )}

        {method === "lot_plan" && (
          <>
            <Field label="Lot" name="lot" required />
            <Field label="Plan" name="plan" required />
          </>
        )}

        {method === "document" && (
          <>
            <Field label="Document type" name="documentType" placeholder="e.g. Mortgage, Caveat" />
            <Field label="Dealing / document number" name="documentNumber" required />
          </>
        )}

        <Field label="Customer Reference 1" name="custRef1" />
        <Field label="Customer Reference 2" name="custRef2" />
      </div>
    </>
  );
}

function NameBrowseFields() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="field-label">Type of information product</label>
        <select name="product" defaultValue="Personal Name Browse" className="field-input">
          <option>Personal Name Browse</option>
          <option>Personal Name Browse (with alias)</option>
        </select>
      </div>
      <Field label="Surname" name="surname" required />
      <Field label="Given name" name="givenName" required />
      <Field label="Middle name" name="middleName" />
      <div />
      <Field label="Date of birth — from" name="dobFrom" type="date" />
      <Field label="Date of birth — to" name="dobTo" type="date" />
      <Field label="Client charge back number" name="chargeBackNumber" className="sm:col-span-2" />
      <div className="sm:col-span-2 flex items-center gap-4">
        <span className="field-label mb-0">Personal extract details</span>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" name="extractDetails" value="current" defaultChecked /> Current
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" name="extractDetails" value="current_historical" /> Current and Historical
        </label>
      </div>
    </div>
  );
}

function CourtFields() {
  const [mode, setMode] = useState<"name" | "company">("name");
  return (
    <>
      <input type="hidden" name="subtype" value={mode} />
      <div className="mb-3 flex items-center gap-4">
        <span className="field-label mb-0">Search by</span>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" name="courtMode" value="name" checked={mode === "name"} onChange={() => setMode("name")} />
          Name
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="courtMode"
            value="company"
            checked={mode === "company"}
            onChange={() => setMode("company")}
          />
          Company / case title
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StateSelect label="Select state" />
        <div />
        {mode === "name" ? (
          <>
            <Field label="Given name" name="givenName" required />
            <Field label="Surname" name="surname" required />
          </>
        ) : (
          <Field label="Company / case title" name="companyCaseTitle" required className="sm:col-span-2" />
        )}
      </div>
    </>
  );
}

function PpsrFields() {
  const [ppsrType, setPpsrType] = useState<PpsrSearchType>("motor_vehicle");
  const isSerial = ["motor_vehicle", "aircraft", "watercraft"].includes(ppsrType);
  const isGrantorInd = ppsrType === "individual_grantor" || ppsrType === "individual_grantor_date_range";
  const isGrantorOrg = ppsrType === "organisation_grantor" || ppsrType === "organisation_grantor_date_range";
  const isDateRange = ppsrType.endsWith("date_range");
  return (
    <>
      <input type="hidden" name="subtype" value={ppsrType} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Search type</label>
          <select
            name="ppsrType"
            value={ppsrType}
            onChange={(e) => setPpsrType(e.target.value as PpsrSearchType)}
            className="field-input"
          >
            {PPSR_SEARCH_TYPES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <Field label="Billing reference" name="billingReference" />

        {isSerial && (
          <>
            <div>
              <label className="field-label">Serial number type</label>
              <select name="serialNumberType" className="field-input" defaultValue={PPSR_SERIAL_TYPES[0].key}>
                {PPSR_SERIAL_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Serial number" name="serialNumber" required placeholder="e.g. 6F5000000MB472119" />
          </>
        )}

        {ppsrType === "registration_number" && (
          <Field label="Registration number" name="registrationNumber" required className="sm:col-span-2" />
        )}

        {ppsrType === "intellectual_property" && (
          <Field label="Grant / IP number" name="serialNumber" required className="sm:col-span-2" />
        )}

        {isGrantorInd && (
          <>
            <Field label="Grantor given name" name="grantorGivenName" required />
            <Field label="Grantor surname" name="grantorSurname" required />
          </>
        )}

        {isGrantorOrg && (
          <>
            <Field label="Organisation name" name="organisationName" required />
            <Field label="ABN / ACN" name="organisationAbn" />
          </>
        )}

        {isDateRange && (
          <>
            <Field label="Date range — from" name="dateFrom" type="date" />
            <Field label="Date range — to" name="dateTo" type="date" />
          </>
        )}
      </div>
    </>
  );
}

function CreditFields() {
  const [searchBy, setSearchBy] = useState<"company" | "individual">("company");
  return (
    <>
      <input type="hidden" name="subtype" value={searchBy} />
      <div className="mb-3 flex items-center gap-4">
        <span className="field-label mb-0">Search by</span>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="creditMode"
            value="company"
            checked={searchBy === "company"}
            onChange={() => setSearchBy("company")}
          />
          Company (commercial)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="creditMode"
            value="individual"
            checked={searchBy === "individual"}
            onChange={() => setSearchBy("individual")}
          />
          Individual (consumer)
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {searchBy === "company" ? (
          <>
            <Field label="Company name" name="companyName" required />
            <Field label="ABN / ACN" name="companyAbn" />
          </>
        ) : (
          <>
            <Field label="First name" name="firstName" required />
            <Field label="Surname" name="surname" required />
            <Field label="Date of birth" name="dob" type="date" />
          </>
        )}
      </div>
    </>
  );
}

// --- shell --------------------------------------------------------------------

export function SearchForm({
  action,
  initialType,
  initialMethod,
  initialCustomerId,
  customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initialType: SearchType;
  initialMethod?: TitleMethod;
  initialCustomerId?: number;
  customers: Array<{ id: number; name: string }>;
}) {
  // The search type is fixed once chosen from the Searches menu — switch by
  // going back to the menu, not by changing it mid-form.
  const type = initialType;

  return (
    <FormFrame action={action} submitLabel="Run search" cancelHref="/searches">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Search</label>
          <div className="field-input flex cursor-not-allowed items-center bg-slate-100 font-medium text-slate-700">
            {SEARCH_TYPES[type].label}
          </div>
        </div>
        <div>
          <label className="field-label">Customer (saved against their account)</label>
          <select
            name="customerId"
            defaultValue={initialCustomerId != null ? String(initialCustomerId) : ""}
            className="field-input"
          >
            <option value="">— Not linked —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Each provider has its own tailored fields. `key` remounts on switch so
          stale sub-state (tabs/radios) never leaks between search types. */}
      <div key={type} className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
        {type === "equifax_title" && <TitleFields initial={initialMethod} />}
        {type === "equifax_name" && <NameBrowseFields />}
        {type === "equifax_credit" && <CreditFields />}
        {type === "ppsr" && <PpsrFields />}
        {type === "court" && <CourtFields />}
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea name="notes" rows={2} className="field-input" />
      </div>
      <p className="text-xs text-slate-500">
        Searches run against the stub provider for now and the result is saved to the customer&apos;s
        search history. Live PPSR / Equifax / court connections replace the stubs later.
      </p>
    </FormFrame>
  );
}
