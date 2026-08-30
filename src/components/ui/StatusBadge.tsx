import { STATUS_LABELS } from "@/lib/validations/member";
import type { MembershipStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<MembershipStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
  OnLeave: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Alumni: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function StatusBadge({
  status,
  className,
}: {
  status: MembershipStatus | string;
  className?: string;
}) {
  const s = status as MembershipStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[s] ?? STATUS_STYLES.Inactive,
        className
      )}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
