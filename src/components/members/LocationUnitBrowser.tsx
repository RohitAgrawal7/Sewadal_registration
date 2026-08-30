"use client";

import Link from "next/link";
import type { Unit } from "@/lib/enums";
import { ALL_UNITS, UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import { orgSettings } from "@/lib/org-settings";
import { cn } from "@/lib/utils";

export function LocationBanner({
  memberCount,
  href,
}: {
  memberCount: number;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
        Location
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
        {orgSettings.locationName}
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        {memberCount} members · {ALL_UNITS.length} units
      </p>
      {href && (
        <p className="mt-3 text-sm font-semibold text-white/90">
          Open location →
        </p>
      )}
    </>
  );

  const className =
    "block rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 px-4 py-4 text-white shadow-sm sm:px-5";

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:from-slate-800 hover:to-slate-600`}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function LocationBreadcrumb({
  unit,
  onBack,
  backHref,
}: {
  unit: Unit | string;
  onBack?: () => void;
  backHref?: string;
}) {
  const backClass =
    "font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline";

  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm">
      {backHref ? (
        <Link href={backHref} className={backClass}>
          {orgSettings.locationName}
        </Link>
      ) : (
        <button type="button" onClick={onBack} className={backClass}>
          {orgSettings.locationName}
        </button>
      )}
      <span className="text-slate-300">/</span>
      <span className="font-semibold text-slate-900">
        {UNIT_LABELS[unit as Unit] ?? unit}
      </span>
    </nav>
  );
}

export function UnitPickGrid({
  counts,
  onSelect,
  hrefs,
}: {
  counts: Partial<Record<Unit, number>>;
  onSelect?: (unit: Unit) => void;
  hrefs?: Partial<Record<Unit, string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ALL_UNITS.map((unit) => {
        const colors = UNIT_COLORS[unit];
        const count = counts[unit] ?? 0;
        const href = hrefs?.[unit];
        const className = cn(
          "group relative overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          colors.border
        );
        const inner = (
          <>
            <div className={cn("absolute inset-x-0 top-0 h-1", colors.bg)} />
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn("text-base font-bold", colors.text)}>
                {UNIT_LABELS[unit]}
              </h3>
              <span
                className={cn(
                  "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold text-white tabular-nums",
                  colors.bg
                )}
              >
                {count}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {count === 1 ? "1 member" : `${count} members`}
            </p>
            <p
              className={cn(
                "mt-3 text-sm font-semibold underline-offset-2 group-hover:underline",
                colors.text
              )}
            >
              View members →
            </p>
          </>
        );

        if (href) {
          return (
            <Link key={unit} href={href} className={className}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={unit}
            type="button"
            onClick={() => onSelect?.(unit)}
            className={className}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
