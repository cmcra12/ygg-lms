import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logout } from "@/app/login/actions";
import { NavLink } from "@/components/NavLink";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/customers", label: "Customers" },
  { href: "/loans", label: "Loans" },
  { href: "/assets", label: "Asset register" },
  { href: "/external-parties", label: "External parties" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-zinc-950 text-zinc-300">
        <Link href="/" className="block border-b border-zinc-800/80 px-5 py-5">
          <span className="block text-lg font-black uppercase tracking-widest text-ygg-400">
            Yellowgate
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Loan Management
          </span>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
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
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
          <form action="/search" method="GET" className="max-w-md">
            <input
              type="search"
              name="q"
              placeholder="Search customers, contacts, VIN, rego, serial, contract no…"
              className="field-input"
            />
          </form>
        </header>
        <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
