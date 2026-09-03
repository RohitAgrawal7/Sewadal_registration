import { Unit } from "@/lib/enums";

export const UNIT_LABELS: Record<Unit, string> = {
  Unit1: "Unit 1",
  Unit2: "Unit 2",
  Unit3: "Unit 3",
  Unit4: "Unit 4",
};

export const UNIT_COLORS: Record<
  Unit,
  {
    bg: string;
    text: string;
    border: string;
    soft: string;
    pill: string;
    selected: string;
  }
> = {
  Unit1: {
    bg: "bg-blue-600",
    text: "text-blue-800",
    border: "border-blue-300",
    soft: "bg-blue-100",
    pill: "bg-blue-100 text-blue-800 border-blue-300",
    selected: "bg-blue-600 text-white border-blue-700",
  },
  Unit2: {
    bg: "bg-green-600",
    text: "text-green-800",
    border: "border-green-300",
    soft: "bg-green-100",
    pill: "bg-green-100 text-green-800 border-green-300",
    selected: "bg-green-600 text-white border-green-700",
  },
  Unit3: {
    bg: "bg-purple-600",
    text: "text-purple-800",
    border: "border-purple-300",
    soft: "bg-purple-100",
    pill: "bg-purple-100 text-purple-800 border-purple-300",
    selected: "bg-purple-600 text-white border-purple-700",
  },
  Unit4: {
    bg: "bg-orange-600",
    text: "text-orange-800",
    border: "border-orange-300",
    soft: "bg-orange-100",
    pill: "bg-orange-100 text-orange-800 border-orange-300",
    selected: "bg-orange-600 text-white border-orange-700",
  },
};

export const UNIT_SWATCH: Record<
  Unit,
  { fill: string; text: string; border: string; solid: string }
> = {
  Unit1: {
    fill: "#dbeafe",
    text: "#1e3a8a",
    border: "#2563eb",
    solid: "#2563eb",
  },
  Unit2: {
    fill: "#dcfce7",
    text: "#14532d",
    border: "#16a34a",
    solid: "#16a34a",
  },
  Unit3: {
    fill: "#f3e8ff",
    text: "#6b21a8",
    border: "#9333ea",
    solid: "#9333ea",
  },
  Unit4: {
    fill: "#ffedd5",
    text: "#9a3412",
    border: "#ea580c",
    solid: "#ea580c",
  },
};

export function unitChipStyle(unit: Unit, selected = false) {
  const c = UNIT_SWATCH[unit];
  if (selected) {
    return {
      backgroundColor: c.solid,
      color: "#ffffff",
      borderColor: c.solid,
    };
  }
  return {
    backgroundColor: c.fill,
    color: c.text,
    borderColor: c.border,
  };
}

export const ALL_UNITS: Unit[] = ["Unit1", "Unit2", "Unit3", "Unit4"];
