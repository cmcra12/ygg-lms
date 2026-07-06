import Link from "next/link";
import { globalSearch } from "@/lib/search";
import { PageHeader, Badge } from "@/components/ui";

const KIND_LABEL: Record<string, { label: string; color: "blue" | "green" | "amber" | "slate" }> = {
  customer: { label: "Customer", color: "blue" },
  contact: { label: "Contact", color: "green" },
  asset: { label: "Asset", color: "amber" },
  loan: { label: "Loan", color: "slate" },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = globalSearch(q, 20);

  return (
    <>
      <PageHeader
        title="Search"
        subtitle={q ? `Results for “${q}”` : "Enter a search term above"}
      />
      <div className="card divide-y divide-slate-100">
        {q && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No matches.</div>
        )}
        {results.map((r, i) => (
          <Link key={i} href={r.href} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-amber-50">
            <span className="w-20 shrink-0">
              <Badge color={KIND_LABEL[r.kind].color}>{KIND_LABEL[r.kind].label}</Badge>
            </span>
            <span className="font-medium">{r.title}</span>
            <span className="min-w-0 truncate text-slate-500">{r.subtitle}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
