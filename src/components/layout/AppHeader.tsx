"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { orgSettings } from "@/lib/org-settings";
import { cn } from "@/lib/utils";
import { PageBackButton } from "@/components/layout/PageBackButton";
import { logoutAction } from "@/lib/auth/actions";

const links = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  {
    href: "/lists",
    label: "Lists",
    match: (p: string) => p === "/lists" || p.startsWith("/lists/"),
  },
  {
    href: "/attendance",
    label: "Attendance",
    match: (p: string) => p.startsWith("/attendance"),
  },
];

export function AppHeader() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <PageBackButton />
          <Link href="/" className="group min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Internal tool
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-slate-700 sm:text-xl">
            {orgSettings.orgName}
          </h1>
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-sm font-medium transition sm:px-3",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/members/new"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:px-3.5"
          >
            Register
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-3"
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
