"use client";

import { useState, useTransition } from "react";
import { notifyInsuranceExpiry, type NotifyResult } from "@/app/(app)/insuranceActions";
import { formatDate } from "@/lib/format";

// Small inline button on each expiring-insurance row. Sends the HubSpot
// renewal template to the client and reflects the result in place.
export function NotifyInsuranceButton({
  policyId,
  lastNotifiedAt,
}: {
  policyId: number;
  lastNotifiedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<NotifyResult | null>(null);
  const [notifiedAt, setNotifiedAt] = useState(lastNotifiedAt);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const r = await notifyInsuranceExpiry(policyId);
      setResult(r);
      if (r.ok) setNotifiedAt(new Date().toISOString());
    });
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title={
          notifiedAt
            ? `Last notified ${formatDate(notifiedAt.slice(0, 10))} — click to send again`
            : "Send the client a HubSpot renewal reminder"
        }
        className="btn-secondary text-xs disabled:opacity-50"
      >
        {pending ? "Sending…" : notifiedAt ? "Notify again" : "Notify"}
      </button>
      {result && (
        <span className={`text-[10px] ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.ok ? "Sent ✓" : result.message}
        </span>
      )}
      {!result && notifiedAt && (
        <span className="text-[10px] text-slate-400">Notified {formatDate(notifiedAt.slice(0, 10))}</span>
      )}
    </span>
  );
}
