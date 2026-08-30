import { Unit } from "@/lib/enums";

export const UNIT_LABELS: Record<Unit, string> = {
  Unit1: "Unit 1",
  Unit2: "Unit 2",
  Unit3: "Unit 3",
  Unit4: "Unit 4",
};

export const UNIT_COLORS: Record<
  Unit,
  { bg: string; text: string; border: string; soft: string; pill: string }
> = {
  Unit1: {
    bg: "bg-blue-600",
    text: "text-blue-700",
    border: "border-blue-600",
    soft: "bg-blue-50",
    pill: "bg-blue-600 text-white border-blue-600",
  },
  Unit2: {
    bg: "bg-green-600",
    text: "text-green-700",
    border: "border-green-600",
    soft: "bg-green-50",
    pill: "bg-green-600 text-white border-green-600",
  },
  Unit3: {
    bg: "bg-purple-600",
    text: "text-purple-700",
    border: "border-purple-600",
    soft: "bg-purple-50",
    pill: "bg-purple-600 text-white border-purple-600",
  },
  Unit4: {
    bg: "bg-orange-600",
    text: "text-orange-700",
    border: "border-orange-600",
    soft: "bg-orange-50",
    pill: "bg-orange-600 text-white border-orange-600",
  },
};

export const ALL_UNITS: Unit[] = ["Unit1", "Unit2", "Unit3", "Unit4"];
