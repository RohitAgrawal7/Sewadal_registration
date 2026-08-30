import { Gender } from "@/lib/enums";

export const GENDER_COLORS: Record<
  Gender,
  { row: string; badge: string }
> = {
  Male: {
    row: "bg-orange-100 hover:bg-orange-200/70",
    badge: "bg-orange-200 text-orange-950 border-orange-300",
  },
  Female: {
    row: "bg-sky-100 hover:bg-sky-200/70",
    badge: "bg-sky-200 text-sky-950 border-sky-300",
  },
  Child: {
    row: "bg-slate-100 hover:bg-slate-200/80",
    badge: "bg-slate-200 text-slate-800 border-slate-300",
  },
};

export function genderColors(gender: string | null | undefined) {
  if (gender === Gender.Male) return GENDER_COLORS.Male;
  if (gender === Gender.Female) return GENDER_COLORS.Female;
  if (gender === Gender.Child) return GENDER_COLORS.Child;
  return {
    row: "hover:bg-slate-50/80",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  };
}
