import Link from "next/link";
import type { MemberWithDerived } from "@/lib/dates";
import {
  averageTenureDays,
  formatAverageTenureDays,
} from "@/lib/dates";
import { countDemographics } from "@/lib/member-stats";
import { ALL_UNITS, UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import { cn } from "@/lib/utils";
import { DemographicBreakdown } from "./DemographicBreakdown";

export function UnitOverview({
  members,
}: {
  members: MemberWithDerived[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Unit overview
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Headcount by Male / Female / Child, plus average tenure
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_UNITS.map((unit) => {
          const unitMembers = members.filter((m) => m.unit === unit);
          const demos = countDemographics(unitMembers);
          const avgDays = averageTenureDays(unitMembers);
          const colors = UNIT_COLORS[unit];

          return (
            <div
              key={unit}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                colors.border
              )}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1", colors.bg)} />
              <div className="flex items-start justify-between gap-2">
                <h3 className={cn("text-base font-bold", colors.text)}>
                  {UNIT_LABELS[unit]}
                </h3>
                <span
                  className={cn(
                    "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold text-white tabular-nums",
                    colors.bg
                  )}
                >
                  {demos.total}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                members
              </p>

              <DemographicBreakdown counts={demos} compact />

              <p className="mt-4 text-sm text-slate-600">Avg unit tenure</p>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {formatAverageTenureDays(avgDays)}
              </p>
              <Link
                href={`/?unit=${unit}`}
                className={cn(
                  "mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 transition group-hover:underline",
                  colors.text
                )}
              >
                View members
                <span aria-hidden>→</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
