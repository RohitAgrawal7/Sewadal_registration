import type { AttendanceTotals } from "@/lib/attendance/stats";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5", tone)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}

export function AttendanceSummaryCards({
  totals,
  title,
}: {
  totals: AttendanceTotals;
  title?: string;
}) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Metric
          label="Attended"
          value={totals.present}
          tone="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <Metric
          label="Absent"
          value={totals.absent}
          tone="border-red-200 bg-red-50 text-red-800"
        />
        <Metric
          label="%"
          value={`${totals.rate}%`}
          tone="border-blue-200 bg-blue-50 text-blue-800"
        />
      </div>
    </div>
  );
}
