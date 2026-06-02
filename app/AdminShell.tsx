import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";

function Icon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "dashboard")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  if (name === "technicians")
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Dashboard", key: "dashboard" },
  { href: "/technicians", label: "Technicians", key: "technicians" },
  { href: "/zones", label: "Zones", key: "zones" },
];

export function AdminShell({
  active,
  title,
  action,
  children,
}: {
  active: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            Y
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">IT Service First</div>
            <div className="text-xs text-slate-500">Yale Authorized Dealer</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((n) => {
            const isActive = active === n.key;
            return (
              <Link
                key={n.key}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon name={n.key} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <form action={logout}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-red-600">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
