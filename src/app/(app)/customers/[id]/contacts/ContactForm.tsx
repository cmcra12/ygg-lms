"use client";

import { useState } from "react";
import { FormFrame, type ActionState } from "@/components/FormFrame";

type ContactValues = {
  kind?: string;
  name?: string;
  mobile?: string | null;
  email?: string | null;
  idVerificationStatus?: string;
  creditCheckStatus?: string;
  notes?: string | null;
};

export function ContactForm({
  action,
  initial = {},
  cancelHref,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ContactValues;
  cancelHref: string;
}) {
  const [kind, setKind] = useState(initial.kind ?? "key");
  const isGuarantor = kind === "director_guarantor";

  return (
    <FormFrame action={action} submitLabel="Save contact" cancelHref={cancelHref}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Name *</label>
          <input name="name" required defaultValue={initial.name ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Kind *</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="field-input">
            <option value="key">Key contact</option>
            <option value="authorised">Authorised contact</option>
            <option value="director_guarantor">Director Guarantor</option>
          </select>
        </div>
        <div>
          <label className="field-label">Mobile</label>
          <input name="mobile" defaultValue={initial.mobile ?? ""} className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" defaultValue={initial.email ?? ""} className="field-input" />
        </div>
        {isGuarantor && (
          <>
            <div>
              <label className="field-label">ID verification</label>
              <select
                name="idVerificationStatus"
                defaultValue={initial.idVerificationStatus === "not_required" ? "pending" : (initial.idVerificationStatus ?? "pending")}
                className="field-input"
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="field-label">Credit check</label>
              <select
                name="creditCheckStatus"
                defaultValue={initial.creditCheckStatus === "not_required" ? "pending" : (initial.creditCheckStatus ?? "pending")}
                className="field-input"
              >
                <option value="pending">Pending</option>
                <option value="clear">Clear</option>
                <option value="adverse">Adverse</option>
              </select>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="field-label">Notes</label>
          <textarea name="notes" rows={2} defaultValue={initial.notes ?? ""} className="field-input" />
        </div>
      </div>
    </FormFrame>
  );
}
