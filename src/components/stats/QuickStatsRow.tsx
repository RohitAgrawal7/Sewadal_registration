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
        "relative overflow-hidden rounded-2xl border px-4 py-3.5 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_8px_18px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_24px_rgba(15,23,42,0.08)]",
        surface ?? "border-slate-200/80 bg-white"
      )}
    >
      {barClass && (
        <div className={cn("absolute inset-y-0 left-0 w-1.5", barClass)} />
      )}
      <p
        className={cn(
          "pl-1 text-[11px] font-semibold uppercase tracking-wide",
          labelClass ?? "text-slate-500"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 pl-1 text-2xl font-bold tabular-nums tracking-tight",
          accent ?? "text-slate-800"
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
            accent="text-sky-950"
            barClass="bg-gradient-to-b from-sky-400 to-blue-700"
            surface="border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-100/70"
            labelClass="text-sky-800"
          />
          <StatCard
            label="Active"
            value={active}
            accent="text-amber-950"
            barClass="bg-gradient-to-b from-amber-400 to-orange-700"
            surface="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-100/60"
            labelClass="text-amber-800"
          />
          {ALL_UNITS.map((u) => (
            <StatCard
              key={u}
              label={UNIT_LABELS[u]}
              value={byUnit[u]}
              accent={UNIT_COLORS[u].text}
              barClass={UNIT_COLORS[u].bg}
              surface={cn(
                UNIT_COLORS[u].border,
                "bg-gradient-to-br from-white",
                UNIT_COLORS[u].soft
              )}
            />
          ))}
          <StatCard
            label="New this month"
            value={newThisMonth}
            accent="text-stone-900"
            barClass="bg-gradient-to-b from-stone-400 to-amber-800"
            surface="border-stone-300 bg-gradient-to-br from-stone-50 via-white to-amber-100/70"
            labelClass="text-stone-700"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_8px_24px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
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
