"use client";

import { useState, useTransition } from "react";
import { notifyInsuranceExpiry, type NotifyResult } from "@/app/(app)/insuranceActions";
import { formatDate } from "@/lib/format";

// HubSpot sprocket mark (brand orange), inlined so no external asset is needed.
function HubspotLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0" fill="#FF7A59">
      <path d="M18.164 7.93V5.084a2.198 2.198 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.194v.067a2.196 2.196 0 0 0 1.252 1.973l.013.006v2.852a6.22 6.22 0 0 0-2.969 1.31l.012-.01-7.828-6.096A2.497 2.497 0 1 0 3.36 6.101l.014-.007 7.696 5.99a6.176 6.176 0 0 0-1.038 3.446c0 1.323.415 2.55 1.122 3.557l-.013-.02-2.342 2.343a1.968 1.968 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033c0-.204-.031-.401-.088-.586l.004.014 2.317-2.317a6.229 6.229 0 1 0 4.964-11.16l-.058-.017zm-1.166 9.348a3.196 3.196 0 1 1 .001-6.392 3.196 3.196 0 0 1 0 6.392z" />
    </svg>
  );
}

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
        className="btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
      >
        <HubspotLogo />
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
