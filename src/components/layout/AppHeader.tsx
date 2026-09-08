"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
    <header className="sticky top-0 z-30 border-b border-sky-200/70 bg-gradient-to-r from-sky-100 via-white to-amber-100/90 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <PageBackButton className="hidden shrink-0 sm:inline-flex" />
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-teal-200/80"
              priority
            />
            <span className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-800/80 sm:text-[11px]">
                Sant Niranakri Mission
              </p>
              <h1 className="truncate text-base font-bold tracking-tight text-slate-800 transition group-hover:text-sky-900 sm:text-xl">
                {orgSettings.orgName}
              </h1>
            </span>
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
                    ? "bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-sky-100/80 hover:text-sky-900"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/members/new"
            className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-amber-500 hover:to-orange-600"
          >
            Register
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-900"
            >
              Logout
            </button>
          </form>
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href="/members/new"
            className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Register
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-teal-200 bg-white/90 text-slate-700"
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
        <div className="border-t border-sky-100 bg-gradient-to-b from-sky-50 to-amber-50/60 md:hidden">
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
                      ? "bg-gradient-to-r from-sky-600 to-blue-700 text-white"
                      : "text-slate-700 hover:bg-white"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <form action={logoutAction} className="mt-1">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-600 hover:bg-white"
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
