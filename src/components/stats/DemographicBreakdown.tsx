import type { DemographicCounts } from "@/lib/member-stats";
import { cn } from "@/lib/utils";

export function DemographicBreakdown({
  counts,
  className,
  compact,
}: {
  counts: DemographicCounts;
  className?: string;
  compact?: boolean;
}) {
  const items = [
    { label: "Male", value: counts.male, tone: "text-orange-950 bg-orange-100" },
    { label: "Female", value: counts.female, tone: "text-sky-950 bg-sky-100" },
    { label: "Child", value: counts.child, tone: "text-slate-800 bg-slate-100" },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1.5",
        compact ? "mt-3" : "mt-4",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-lg px-2 py-1.5 text-center",
            item.tone
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            {item.label}
          </p>
          <p
            className={cn(
              "font-bold tabular-nums",
              compact ? "text-base" : "text-lg"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
