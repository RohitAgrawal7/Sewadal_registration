import type { Unit } from "@/lib/enums";
import type { MemberWithDerived } from "@/lib/dates";
import { countDemographics } from "@/lib/member-stats";
import { ALL_UNITS, UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import { cn } from "@/lib/utils";
import { DemographicBreakdown } from "./DemographicBreakdown";

function StatCard({
  label,
  value,
  accent,
  barClass,
  surface,
  labelClass,
}: {
  label: string;
  value: number | string;
  accent?: string;
  barClass?: string;
  surface?: string;
  labelClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-sm",
        surface ?? "border-slate-200/80 bg-white"
      )}
    >
      {barClass && (
        <div className={cn("absolute inset-y-0 left-0 w-1", barClass)} />
      )}
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          labelClass ?? "text-slate-500"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums tracking-tight",
          accent ?? "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function QuickStatsRow({
  total,
  active,
  byUnit,
  newThisMonth,
  members,
}: {
  total: number;
  active: number;
  byUnit: Record<Unit, number>;
  newThisMonth: number;
  members: MemberWithDerived[];
}) {
  const totals = countDemographics(members);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Quick stats
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <StatCard
            label="Total members"
            value={total}
            surface="border-slate-800 bg-slate-900"
            labelClass="text-slate-400"
            accent="text-white"
          />
          <StatCard
            label="Active"
            value={active}
            accent="text-teal-800"
            barClass="bg-teal-500"
            surface="border-teal-200 bg-teal-50"
            labelClass="text-teal-700"
          />
          {ALL_UNITS.map((u) => (
            <StatCard
              key={u}
              label={UNIT_LABELS[u]}
              value={byUnit[u]}
              accent={UNIT_COLORS[u].text}
              barClass={UNIT_COLORS[u].bg}
              surface={cn("border-slate-200", UNIT_COLORS[u].soft)}
            />
          ))}
          <StatCard
            label="New this month"
            value={newThisMonth}
            accent="text-indigo-800"
            barClass="bg-indigo-500"
            surface="border-indigo-200 bg-indigo-50"
            labelClass="text-indigo-700"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Totals by gender &amp; age
            </h3>
            <p className="text-xs text-slate-500">
              Across all units · from gender (Male / Female / Child)
            </p>
          </div>
          <p className="text-sm font-medium text-slate-600">
            {totals.total} members
          </p>
        </div>
        <DemographicBreakdown counts={totals} />
      </div>
    </section>
  );
}
