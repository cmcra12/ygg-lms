"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// The one list component for the whole app. Every list screen gets sorting,
// a text filter and CSV export for free. Rows are plain serialisable data so
// server components can prepare them (formatting included) and pass them in.

export type Cell =
  | string
  | number
  | null
  | {
      text: string;
      /** Raw value used for sorting; falls back to text. */
      sort?: string | number;
      badge?: "green" | "red" | "amber" | "slate" | "blue";
    };

export type ColumnDef = {
  key: string;
  header: string;
  align?: "left" | "right";
};

export type DataTableRow = {
  /** Cell values keyed by column key. */
  cells: Record<string, Cell>;
  /** Optional click-through target for the whole row. */
  href?: string;
};

const BADGE_CLASSES: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
};

function cellText(cell: Cell): string {
  if (cell == null) return "";
  if (typeof cell === "object") return cell.text;
  return String(cell);
}

function cellSort(cell: Cell): string | number {
  if (cell == null) return "";
  if (typeof cell === "object") return cell.sort ?? cell.text;
  return cell;
}

function toCsv(columns: ColumnDef[], rows: DataTableRow[]): string {
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(cellText(r.cells[c.key]))).join(","));
  return [header, ...body].join("\n");
}

export function DataTable({
  columns,
  rows,
  filename,
  emptyMessage = "No records.",
}: {
  columns: ColumnDef[];
  rows: DataTableRow[];
  /** Base name for the exported CSV file. */
  filename: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visible = useMemo(() => {
    let out = rows;
    const q = filter.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        columns.some((c) => cellText(r.cells[c.key]).toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = cellSort(a.cells[sortKey]);
        const bv = cellSort(b.cells[sortKey]);
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "en-AU", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, columns, filter, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(columns, visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5">
        <input
          type="search"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="field-input max-w-xs"
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {visible.length} of {rows.length}
          </span>
          <button type="button" onClick={exportCsv} className="btn-secondary text-xs">
            Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`cursor-pointer select-none px-4 py-2 font-semibold hover:text-slate-800 ${c.align === "right" ? "text-right" : ""}`}
                  onClick={() => toggleSort(c.key)}
                >
                  {c.header}
                  {sortKey === c.key && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {visible.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-slate-100 last:border-0 ${row.href ? "cursor-pointer hover:bg-amber-50" : ""}`}
                onClick={row.href ? () => router.push(row.href!) : undefined}
              >
                {columns.map((c) => {
                  const cell = row.cells[c.key];
                  const isBadge = cell != null && typeof cell === "object" && cell.badge;
                  return (
                    <td
                      key={c.key}
                      className={`px-4 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                    >
                      {isBadge ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[(cell as { badge: string }).badge]}`}
                        >
                          {cellText(cell)}
                        </span>
                      ) : (
                        cellText(cell)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
