import { UNIT_LABELS, UNIT_SWATCH } from "@/lib/unit-colors";
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
  const swatch = UNIT_SWATCH[u] ?? UNIT_SWATCH.Unit1;
  const label = UNIT_LABELS[u] ?? unit;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{
        backgroundColor: swatch.fill,
        color: swatch.text,
        borderColor: swatch.border,
      }}
    >
      {label || "—"}
    </span>
  );
}
