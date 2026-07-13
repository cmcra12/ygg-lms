"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  searchAccountsForActions,
  recordTransaction,
  loadOpenWorkflowsForActions,
  overrideWorkflow,
  type AccountHit,
  type OpenWorkflowHit,
} from "@/app/(app)/actionsMenuActions";

const TXN_TYPES = [
  { key: "payment", label: "Payment received" },
  { key: "charge", label: "Charge" },
  { key: "dishonour_fee", label: "Dishonour fee" },
  { key: "adjustment", label: "Adjustment" },
] as const;

function todayIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// --- shared modal shell -------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- record a payment ---------------------------------------------------------

function PaymentModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AccountHit[]>([]);
  const [selected, setSelected] = useState<AccountHit | null>(null);
  const [type, setType] = useState<(typeof TXN_TYPES)[number]["key"]>("payment");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; loanId?: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected) return; // not searching once picked
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(() => {
      searchAccountsForActions(query).then(setHits);
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, selected]);

  function submit() {
    if (!selected) {
      setResult({ ok: false, message: "Pick an account first." });
      return;
    }
    startTransition(async () => {
      const r = await recordTransaction({ loanId: selected.loanId, type, amount, date, description });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  if (result?.ok) {
    return (
      <Modal title="Payment recorded" onClose={onClose}>
        <p className="text-sm text-slate-700">{result.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Link
            href={`/accounts/${result.loanId}`}
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            View account
          </Link>
          <button type="button" className="btn-primary text-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Record a payment or charge" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="field-label">Account</label>
          {selected ? (
            <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
              <span>
                <span className="font-semibold">{selected.contractNumber}</span> · {selected.customerName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="text-xs text-ygg-700 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contract number or customer name…"
                className="field-input"
              />
              {hits.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {hits.map((h) => (
                    <button
                      key={h.loanId}
                      type="button"
                      onClick={() => {
                        setSelected(h);
                        setHits([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-ygg-50"
                    >
                      <span className="font-semibold">{h.contractNumber}</span> · {h.customerName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field-input">
              {TXN_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Amount ex GST ($)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="field-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="field-input" />
          </div>
        </div>
        {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary text-sm disabled:opacity-50" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Record"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// --- override a workflow ------------------------------------------------------

function OverrideModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [list, setList] = useState<OpenWorkflowHit[] | null>(null);
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    loadOpenWorkflowsForActions().then(setList);
  }, []);

  function run(mode: "complete" | "cancel") {
    if (workflowId == null) {
      setResult({ ok: false, message: "Pick a workflow first." });
      return;
    }
    startTransition(async () => {
      const r = await overrideWorkflow(workflowId, mode);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <Modal title="Override a workflow" onClose={onClose}>
      {result?.ok ? (
        <>
          <p className="text-sm text-slate-700">{result.message}</p>
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-primary text-sm" onClick={onClose}>
              Done
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Force an open workflow through — completing marks every outstanding step done; cancelling
            skips them and closes it.
          </p>
          <div>
            <label className="field-label">Open workflow</label>
            <select
              value={workflowId ?? ""}
              onChange={(e) => setWorkflowId(e.target.value ? Number(e.target.value) : null)}
              className="field-input"
            >
              <option value="">{list == null ? "Loading…" : "— Select —"}</option>
              {(list ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.description} · {w.label}
                </option>
              ))}
            </select>
            {list != null && list.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">No open workflows.</p>
            )}
          </div>
          {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary text-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger text-sm disabled:opacity-50"
              onClick={() => run("cancel")}
              disabled={pending}
            >
              Cancel workflow
            </button>
            <button
              type="button"
              className="btn-primary text-sm disabled:opacity-50"
              onClick={() => run("complete")}
              disabled={pending}
            >
              Force complete
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// --- the menu itself ----------------------------------------------------------

export function ActionsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<null | "payment" | "override">(null);

  // Hidden on the application form (new / edit) so it doesn't crowd the form.
  const hidden = pathname === "/applications/new" || /^\/applications\/\d+\/edit$/.test(pathname);
  if (hidden) return null;

  const quickLinks = [
    { href: "/applications/new", label: "New application" },
    { href: "/customers/new", label: "New customer" },
    { href: "/assets/new", label: "New asset" },
    { href: "/searches", label: "Run a search" },
  ];

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        {open && (
          <div className="mb-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </div>
            <button
              type="button"
              onClick={() => {
                setModal("payment");
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-ygg-50"
            >
              💵 Record a payment / charge
            </button>
            <button
              type="button"
              onClick={() => {
                setModal("override");
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-ygg-50"
            >
              ⚙️ Override a workflow
            </button>
            <div className="border-t border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick create
            </div>
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-ygg-50"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
        >
          <span className="text-ygg-400">⚡</span>
          Actions
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▴</span>
        </button>
      </div>

      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} />}
      {modal === "override" && <OverrideModal onClose={() => setModal(null)} />}
    </>
  );
}
