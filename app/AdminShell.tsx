import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, MapPin, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Dashboard", key: "dashboard", Icon: LayoutDashboard },
  { href: "/technicians", label: "Technicians", key: "technicians", Icon: Users },
  { href: "/zones", label: "Zones", key: "zones", Icon: MapPin },
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
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background sm:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            Y
          </span>
          <div className="leading-tight">
            <div className="font-serif text-base font-semibold text-foreground">IT Service First</div>
            <div className="text-xs text-muted-foreground">Yale Authorized Dealer</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, key, Icon }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-accent" : ""}`} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur sm:px-8">
          <h1 className="font-serif text-2xl text-foreground">{title}</h1>
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
