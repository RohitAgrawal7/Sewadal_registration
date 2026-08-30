import { format } from "date-fns";
import type { UnitAssignmentLog } from "@prisma/client";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { formatTenure, tenureBetween } from "@/lib/dates";

export function UnitHistoryTimeline({
  logs,
}: {
  logs: UnitAssignmentLog[];
}) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-slate-500">No unit history recorded yet.</p>
    );
  }

  const sorted = [...logs].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  return (
    <ol className="space-y-3">
      {sorted.map((log) => {
        const end = log.endDate;
        const tenure = formatTenure(tenureBetween(log.startDate, end ?? undefined));
        const range = end
          ? `${format(log.startDate, "MMM yyyy")} – ${format(end, "MMM yyyy")}`
          : `${format(log.startDate, "MMM yyyy")} – present`;

        return (
          <li
            key={log.id}
            className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
          >
            <UnitBadge unit={log.unit} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{range}</p>
              <p className="text-xs text-slate-500">Tenure: {tenure}</p>
            </div>
            {!end && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Current
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
