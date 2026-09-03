"use client";

import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <PageBackButton className="hidden shrink-0 sm:inline-flex" />
          <Link href="/" className="group min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px]">
              Internal tool
            </p>
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 transition group-hover:text-slate-700 sm:text-xl">
              {orgSettings.orgName}
            </h1>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex md:gap-2">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
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
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Register
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Logout
            </button>
          </form>
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href="/members/new"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Register
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            <div className="mb-1 sm:hidden">
              <PageBackButton className="w-full justify-center" />
            </div>
            {links.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-3 text-sm font-medium",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <form action={logoutAction} className="mt-1">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
