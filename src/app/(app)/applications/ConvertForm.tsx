"use client";

import { useActionState } from "react";
import type { ActionState } from "@/components/FormFrame";

export function ConvertForm({
  action,
  defaultStartDate,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultStartDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="card flex flex-wrap items-end gap-4 p-4">
      {state.error && (
        <div className="w-full rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <div>
        <label className="field-label">Start date</label>
        <input name="startDate" type="date" defaultValue={defaultStartDate} className="field-input" />
      </div>
      <div>
        <label className="field-label">Payment frequency</label>
        <select name="paymentFrequency" defaultValue="monthly" className="field-input">
          <option value="monthly">Monthly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Converting…" : "Open rental account"}
      </button>
      <p className="w-full text-xs text-slate-500">
        Creates the rental account, moves the assets onto it and registers the PMSI on each asset.
      </p>
    </form>
  );
}
