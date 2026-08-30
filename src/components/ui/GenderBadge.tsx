import { GENDER_LABELS } from "@/lib/validations/member";
import type { Gender } from "@/lib/enums";
import { genderColors } from "@/lib/gender-colors";
import { cn } from "@/lib/utils";

export function GenderBadge({
  gender,
  className,
}: {
  gender: string | null | undefined;
  className?: string;
}) {
  if (!gender) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        genderColors(gender).badge,
        className
      )}
    >
      {GENDER_LABELS[gender as Gender] ?? gender}
    </span>
  );
}
