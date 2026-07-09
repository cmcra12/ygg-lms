import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logout } from "@/app/login/actions";
import { NavLink } from "@/components/NavLink";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/customers", label: "Customers" },
  { href: "/accounts", label: "Accounts" },
  { href: "/collections", label: "Collections" },
  { href: "/assets", label: "Asset register" },
  { href: "/external-parties", label: "External parties" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-zinc-950 text-zinc-300">
        <Link href="/" className="block px-5 pt-5 pb-3">
          <span className="block text-xl font-bold tracking-tight text-white">
            <span className="text-ygg-400">YGG</span> LMS
          </span>
          <span className="block text-xs text-zinc-500">Yellowgate Loan Management</span>
        </Link>
        <div className="border-b border-zinc-800/80 px-3 pb-4">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Search
          </div>
          <form action="/search" method="GET">
            <input
              type="search"
              name="q"
              placeholder="Name, VIN, rego, contract…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-ygg-400 focus:outline-none focus:ring-1 focus:ring-ygg-400"
            />
          </form>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
          <NavLink href="/searches" label="Searches" />
          <div className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
            Admin
          </div>
          {can(user, "audit:view") && <NavLink href="/audit" label="Audit log" />}
          {can(user, "users:manage") && <NavLink href="/settings/users" label="Staff" />}
        </nav>
        <div className="border-t border-zinc-800/80 px-5 py-4 text-xs">
          <div className="font-semibold text-white">{user.name}</div>
          <div className="capitalize text-zinc-500">{user.role}</div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 cursor-pointer text-zinc-500 underline-offset-2 hover:text-ygg-400 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
