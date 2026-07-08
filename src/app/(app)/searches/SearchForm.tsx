"use client";

import { useState } from "react";
import { FormFrame, type ActionState } from "@/components/FormFrame";
import { SEARCH_TYPES, SEARCH_TYPE_KEYS, type SearchType } from "@/lib/searchTypes";

export function SearchForm({
  action,
  initialType,
  initialCustomerId,
  customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initialType: SearchType;
  initialCustomerId?: number;
  customers: Array<{ id: number; name: string }>;
}) {
  const [type, setType] = useState<SearchType>(initialType);
  const config = SEARCH_TYPES[type];

  return (
    <FormFrame action={action} submitLabel="Run search" cancelHref="/searches">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Search type *</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as SearchType)}
            className="field-input"
          >
            {SEARCH_TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {SEARCH_TYPES[key].label}
              </option>
            ))}
          </select>
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
        <div className="sm:col-span-2">
          <label className="field-label">{config.subjectLabel} *</label>
          <input name="subject" required placeholder={config.subjectHint} className="field-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={2} className="field-input" />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Searches run against the stub provider for now and the result summary is saved to the
        customer&apos;s search history. Live PPSR/Equifax/court connections replace the stubs later.
      </p>
    </FormFrame>
  );
}
