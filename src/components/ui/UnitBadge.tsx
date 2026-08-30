import { UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import type { Unit } from "@/lib/enums";
import { cn } from "@/lib/utils";

export function UnitBadge({
  unit,
  className,
}: {
  unit: Unit | string;
  className?: string;
}) {
  const u = unit as Unit;
  const colors = UNIT_COLORS[u] ?? UNIT_COLORS.Unit1;
  const label = UNIT_LABELS[u] ?? unit;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        colors.soft,
        colors.text,
        colors.border,
        className
      )}
    >
      {label || "—"}
    </span>
  );
}
