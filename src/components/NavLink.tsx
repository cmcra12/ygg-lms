"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function NavLink({ href, label, exact }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [base, query] = href.split("?");
  let active: boolean;
  if (query) {
    // e.g. /searches/new?type=ppsr — active only when the type matches too.
    const want = new URLSearchParams(query);
    active =
      pathname === base && [...want.entries()].every(([k, v]) => searchParams.get(k) === v);
  } else if (exact || base === "/") {
    active = pathname === base;
  } else {
    active = pathname === base || pathname.startsWith(base + "/");
  }

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-ygg-400 text-slate-950"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
