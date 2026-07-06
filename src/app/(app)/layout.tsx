import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logout } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/loans", label: "Loans" },
  { href: "/assets", label: "Asset register" },
  { href: "/external-parties", label: "External parties" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-300">
        <Link href="/" className="px-5 py-4 text-lg font-black tracking-tight text-white">
          <span className="text-amber-400">YGG</span> LMS
        </Link>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 px-3">
            Admin
          </div>
          {can(user, "audit:view") && (
            <Link
              href="/audit"
              className="block rounded px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white"
            >
              Audit log
            </Link>
          )}
          {can(user, "users:manage") && (
            <Link
              href="/settings/users"
              className="block rounded px-3 py-2 text-sm font-medium hover:bg-slate-800 hover:text-white"
            >
              Staff
            </Link>
          )}
        </nav>
        <div className="border-t border-slate-800 px-5 py-3 text-xs">
          <div className="font-medium text-white">{user.name}</div>
          <div className="capitalize text-slate-400">{user.role}</div>
          <form action={logout}>
            <button type="submit" className="mt-2 text-slate-400 underline hover:text-white cursor-pointer">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-2.5">
          <form action="/search" method="GET" className="max-w-md">
            <input
              type="search"
              name="q"
              placeholder="Search customers, contacts, VIN, rego, serial, contract no…"
              className="field-input"
            />
          </form>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
