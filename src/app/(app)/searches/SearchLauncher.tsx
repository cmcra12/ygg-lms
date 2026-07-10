"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SEARCH_TYPES, SEARCH_TYPE_KEYS, TITLE_METHODS, type SearchType } from "@/lib/searchTypes";

const TILE_COLORS: Record<string, string> = {
  "Land titles (Equifax)": "bg-rose-700",
  Equifax: "bg-slate-700",
  PPSR: "bg-emerald-700",
  "Court data": "bg-indigo-700",
};

// Grouped, filterable launcher — pick a search to run it.
export function SearchLauncher() {
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState<string>("All");

  const groups = useMemo(() => {
    const names: string[] = [];
    for (const key of SEARCH_TYPE_KEYS) {
      const g = SEARCH_TYPES[key].group;
      if (!names.includes(g)) names.push(g);
    }
    return names;
  }, []);

  const q = filter.trim().toLowerCase();
  const visibleByGroup = groups
    .filter((g) => group === "All" || g === group)
    .map((g) => ({
      group: g,
      types: SEARCH_TYPE_KEYS.filter(
        (key) =>
          SEARCH_TYPES[key].group === g &&
          (!q ||
            SEARCH_TYPES[key].label.toLowerCase().includes(q) ||
            SEARCH_TYPES[key].description.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.types.length > 0);

  return (
    <div>
      <input
        type="search"
        placeholder="Type to filter searches list"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="field-input mb-3 max-w-xl"
      />
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {["All", ...groups].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              group === g
                ? "bg-slate-800 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {visibleByGroup.length === 0 && (
        <div className="card px-4 py-8 text-center text-sm text-slate-400">
          No searches match your filter.
        </div>
      )}
      {visibleByGroup.map(({ group: g, types }) => (
        <div key={g} className="mb-5 max-w-2xl">
          <h2 className="mb-1 text-lg font-bold text-ygg-600">{g}</h2>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {types.map((key: SearchType) => {
              const config = SEARCH_TYPES[key];
              return (
                <div key={key}>
                  <Link
                    href={`/searches/new?type=${key}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ygg-50"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${TILE_COLORS[config.group] ?? "bg-slate-700"}`}
                    >
                      {config.tile}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">{config.label}</span>
                      <span className="block truncate text-xs text-slate-500">{config.description}</span>
                    </span>
                  </Link>
                  {/* Land titles can be reached several ways — list them so each is one click. */}
                  {key === "equifax_title" && (
                    <div className="flex flex-wrap gap-2 bg-slate-50/70 px-4 pb-3 pl-16">
                      {TITLE_METHODS.map((m) => (
                        <Link
                          key={m.key}
                          href={`/searches/new?type=equifax_title&method=${m.key}`}
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-rose-400 hover:text-rose-700"
                        >
                          {m.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
