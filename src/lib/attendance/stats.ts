import { AttendanceStatus } from "@/lib/enums";
import type { Unit } from "@/lib/enums";
import { UNIT_LABELS } from "@/lib/unit-colors";
import { Gender } from "@/lib/enums";

export type DaySummary = {
  dateKey: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  totalMembers: number;
  recorded: number;
};

export type AttendanceTotals = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  recorded: number;
  expected: number;
  rate: number;
};

export type UnitAttendanceBreakdown = {
  unit: Unit;
  label: string;
} & AttendanceTotals;

export type GenderAttendanceBreakdown = {
  gender: string;
  label: string;
} & AttendanceTotals;

export type MemberAttendanceRow = {
  memberId: string;
  fullName: string;
  unit: string;
  gender: string | null;
  status: AttendanceStatus | null;
  notes: string | null;
  sessions?: number;
  attended?: number;
  absentCount?: number;
  rate?: number;
};

function emptyTotals(expected = 0): AttendanceTotals {
  return {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    unmarked: expected,
    recorded: 0,
    expected,
    rate: 0,
  };
}

function finalize(t: AttendanceTotals): AttendanceTotals {
  t.rate =
    t.expected > 0 ? Math.round((t.present / t.expected) * 1000) / 10 : 0;
  return t;
}

export const MARK_STATUSES = [
  AttendanceStatus.Present,
  AttendanceStatus.Absent,
] as const;

export function formatPaRate(t: {
  present: number;
  absent: number;
  rate: number;
}) {
  return `${t.present} attended · ${t.absent} absent · ${t.rate}%`;
}

export function summarizeStatuses(
  statuses: (AttendanceStatus | null | string)[],
  expected?: number
): AttendanceTotals {
  const t = emptyTotals(expected ?? statuses.length);
  t.unmarked = 0;
  for (const s of statuses) {
    if (s === AttendanceStatus.Present) t.present += 1;
    else if (s === AttendanceStatus.Absent) t.absent += 1;
    else if (s === AttendanceStatus.Late) t.late += 1;
    else if (s === AttendanceStatus.Excused) t.excused += 1;
    else t.unmarked += 1;
  }
  t.recorded = t.present + t.absent + t.late + t.excused;
  if (expected !== undefined) {
    t.expected = expected;
    t.unmarked = Math.max(0, expected - t.recorded);
  }
  return finalize(t);
}

export function groupByUnit(
  rows: MemberAttendanceRow[]
): UnitAttendanceBreakdown[] {
  const units: Unit[] = ["Unit1", "Unit2", "Unit3", "Unit4"];
  return units.map((unit) => {
    const unitRows = rows.filter((r) => r.unit === unit);
    const totals = summarizeStatuses(
      unitRows.map((r) => r.status),
      unitRows.length
    );
    return {
      unit,
      label: UNIT_LABELS[unit],
      ...totals,
    };
  });
}

export function groupByGender(
  rows: MemberAttendanceRow[]
): GenderAttendanceBreakdown[] {
  const order = [
    { key: Gender.Male, label: "Male" },
    { key: Gender.Female, label: "Female" },
    { key: Gender.Child, label: "Child" },
    { key: "__other__", label: "Other / Unspecified" },
  ];

  return order
    .map(({ key, label }) => {
      const genderRows = rows.filter((r) => {
        if (key === "__other__") {
          return (
            !r.gender ||
            (r.gender !== Gender.Male &&
              r.gender !== Gender.Female &&
              r.gender !== Gender.Child)
          );
        }
        return r.gender === key;
      });
      const totals = summarizeStatuses(
        genderRows.map((r) => r.status),
        genderRows.length
      );
      return { gender: key, label, ...totals };
    })
    .filter((g) => g.expected > 0);
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  Excused: "Excused",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Absent: "bg-red-100 text-red-800 border-red-200",
  Late: "bg-amber-100 text-amber-800 border-amber-200",
  Excused: "bg-slate-100 text-slate-700 border-slate-200",
};
