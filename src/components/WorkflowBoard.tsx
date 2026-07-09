import Link from "next/link";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { workflowCode, type WorkflowTemplate } from "@/lib/workflows";
import { Badge } from "@/components/ui";
import {
  actionWorkflowItem,
  openWorkflow,
  reopenWorkflowItem,
  skipWorkflowItem,
} from "@/app/(app)/workflowActions";

type WorkflowRow = {
  id: number;
  templateKey: string;
  description: string;
  status: "open" | "complete" | "cancelled";
  allocatedTo: number | null;
  openedBy: number | null;
  openedAt: string;
  completedAt: string | null;
};

type ItemRow = {
  id: number;
  workflowId: number;
  position: number;
  key: string;
  label: string;
  kind: "task" | "approval" | "auto";
  note: string | null;
  status: "pending" | "done" | "skipped";
  actionedBy: number | null;
  actionedAt: string | null;
};

const STATUS_BADGE: Record<string, "green" | "amber" | "slate"> = {
  open: "amber",
  complete: "green",
  cancelled: "slate",
};

// finPOWER-style three-panel workflow view: workflow list | items | summary.
export function WorkflowBoard({
  entries,
  selectedId,
  makeHref,
  revalidate,
  userNames,
  startable,
  entityType,
  entityId,
  editable,
  summary,
}: {
  entries: Array<{ workflow: WorkflowRow; items: ItemRow[] }>;
  selectedId?: number;
  /** Builds the href that selects a workflow (wf param). */
  makeHref: (workflowId: number) => string;
  revalidate: string;
  userNames: Map<number, string>;
  startable: WorkflowTemplate[];
  entityType: "application" | "account";
  entityId: number;
  editable: boolean;
  /** Right-hand entity summary card rows. */
  summary: { title: string; rows: Array<[string, React.ReactNode]> };
}) {
  const selected =
    entries.find((e) => e.workflow.id === selectedId) ?? entries[entries.length - 1];
  const currentItemId = selected?.items.find((i) => i.status === "pending")?.id;
  const openTemplateKeys = new Set(
    entries.filter((e) => e.workflow.status === "open").map((e) => e.workflow.templateKey),
  );
  const startableNow = startable.filter((t) => !openTemplateKeys.has(t.key));

  return (
    <div>
      {editable && startableNow.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {startableNow.map((t) => (
            <form key={t.key} action={openWorkflow.bind(null, t.key, entityType, entityId, revalidate)}>
              <button type="submit" className="btn-secondary text-xs">
                Open {t.name} workflow
              </button>
            </form>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card px-4 py-10 text-center text-sm text-slate-400">
          No workflows opened yet.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr_0.9fr]">
          {/* Workflow list */}
          <div className="card overflow-hidden self-start">
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Workflow</span>
              <span>Description</span>
              <span>Opened</span>
            </div>
            <div className="divide-y divide-slate-100">
              {entries.map(({ workflow }) => (
                <Link
                  key={workflow.id}
                  href={makeHref(workflow.id)}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 py-2.5 text-sm transition-colors ${
                    selected?.workflow.id === workflow.id ? "bg-ygg-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-ygg-600">{workflowCode(workflow.id)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{workflow.description}</span>
                    <Badge color={STATUS_BADGE[workflow.status]}>{titleCase(workflow.status)}</Badge>
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {formatDate(workflow.openedAt.slice(0, 10))}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Items */}
          {selected && (
            <div className="card self-start overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Items — {selected.workflow.description}
              </div>
              <div className="divide-y divide-slate-100">
                {selected.items.map((item) => {
                  const isCurrent = item.id === currentItemId && selected.workflow.status === "open";
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                        isCurrent
                          ? "bg-emerald-50"
                          : item.status === "done"
                            ? ""
                            : "text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          item.status === "done"
                            ? "bg-emerald-500 text-white"
                            : item.status === "skipped"
                              ? "bg-slate-300 text-white"
                              : isCurrent
                                ? "border-2 border-emerald-500 text-emerald-600"
                                : "border border-slate-300 text-slate-400"
                        }`}
                      >
                        {item.status === "done" ? "✓" : item.status === "skipped" ? "–" : item.position}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block ${isCurrent ? "font-semibold text-slate-900" : item.status === "done" ? "font-medium" : ""} ${item.status === "skipped" ? "line-through" : ""}`}
                        >
                          {item.label}
                          {item.kind === "approval" && (
                            <span className="ml-1.5 align-middle">
                              <Badge color="blue">Approval</Badge>
                            </span>
                          )}
                          {item.kind === "auto" && (
                            <span className="ml-1.5 align-middle">
                              <Badge color="slate">Auto</Badge>
                            </span>
                          )}
                        </span>
                        {item.status === "done" && item.actionedAt && (
                          <span className="block text-xs text-slate-500">
                            {userNames.get(item.actionedBy ?? -1) ?? "—"} on{" "}
                            {formatDateTime(item.actionedAt)}
                          </span>
                        )}
                        {item.note && item.status !== "done" && (
                          <span className="block truncate text-xs text-slate-400">{item.note}</span>
                        )}
                      </span>
                      {editable && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          {isCurrent && (
                            <>
                              <form action={actionWorkflowItem.bind(null, selected.workflow.id, item.id, revalidate)}>
                                <button
                                  type="submit"
                                  title="Action this step"
                                  className="flex h-7 w-9 cursor-pointer items-center justify-center rounded-lg bg-ygg-400 font-bold text-slate-900 shadow-sm transition-colors hover:bg-ygg-500"
                                >
                                  →
                                </button>
                              </form>
                              <form action={skipWorkflowItem.bind(null, selected.workflow.id, item.id, revalidate)}>
                                <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                                  Skip
                                </button>
                              </form>
                            </>
                          )}
                          {item.status !== "pending" && (
                            <form action={reopenWorkflowItem.bind(null, selected.workflow.id, item.id, revalidate)}>
                              <button type="submit" className="btn-secondary px-2 py-1 text-xs">
                                Reopen
                              </button>
                            </form>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {selected && (
            <div className="space-y-4 self-start">
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Workflow
                </div>
                <dl className="space-y-1.5 p-4 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Code:</dt>
                    <dd className="font-semibold text-ygg-600">{workflowCode(selected.workflow.id)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Description:</dt>
                    <dd className="font-bold">{selected.workflow.description}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Status:</dt>
                    <dd>
                      <strong>{titleCase(selected.workflow.status)}</strong>{" "}
                      <span className="text-xs text-slate-500">
                        (Opened {formatDate(selected.workflow.openedAt.slice(0, 10))}
                        {selected.workflow.completedAt &&
                          `, completed ${formatDate(selected.workflow.completedAt.slice(0, 10))}`}
                        )
                      </span>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Allocated to:</dt>
                    <dd className="font-medium">
                      {userNames.get(selected.workflow.allocatedTo ?? -1) ?? "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-slate-500">Progress:</dt>
                    <dd>
                      {selected.items.filter((i) => i.status !== "pending").length} of{" "}
                      {selected.items.length} items
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {summary.title}
                </div>
                <dl className="space-y-1.5 p-4 text-sm">
                  {summary.rows.map(([label, value]) => (
                    <div key={String(label)} className="flex gap-2">
                      <dt className="w-24 shrink-0 text-slate-500">{label}:</dt>
                      <dd className="min-w-0 flex-1 font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
