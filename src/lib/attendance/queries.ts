import {
  endOfDay,
  endOfMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { type Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import type { AttendanceStatus } from "@/lib/enums";
import {
  groupByGender,
  groupByUnit,
  summarizeStatuses,
  type DaySummary,
  type MemberAttendanceRow,
} from "@/lib/attendance/stats";
import { UNIT_LABELS } from "@/lib/unit-colors";
import { dateKey, parseDateKey } from "@/lib/attendance/date-utils";

export { dateKey, parseDateKey } from "@/lib/attendance/date-utils";

export async function getActiveMembers(unit?: Unit | "all") {
  const members = await prisma.member.findMany({
    where: {
      ...(unit && unit !== "all" ? { unit } : {}),
    },
    orderBy: [{ unit: "asc" }, { fullName: "asc" }],
  });
  return members;
}

export async function getMembersForSearch() {
  const members = await prisma.member.findMany({
    select: {
      id: true,
      fullName: true,
      preferredName: true,
      gender: true,
      phonePrimary: true,
      address: true,
      city: true,
      stateRegion: true,
      unit: true,
      dateOfBirth: true,
      membershipStatus: true,
    },
    orderBy: { fullName: "asc" },
  });

  return members.map((m) => ({
    ...m,
    dateOfBirth: m.dateOfBirth.toISOString(),
  }));
}

export async function getAttendanceSession(dateKeyStr: string) {
  const day = parseDateKey(dateKeyStr);
  return prisma.attendanceSession.findUnique({ where: { date: day } });
}

export async function getAttendanceForDate(dateKeyStr: string, unit?: Unit | "all") {
  const day = parseDateKey(dateKeyStr);
  const members = await getActiveMembers(unit);
  const memberIds = members.map((m) => m.id);
  const [records, lifetime] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        date: day,
        memberId: { in: memberIds.length ? memberIds : ["__none__"] },
      },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["memberId", "status"],
      where: {
        memberId: { in: memberIds.length ? memberIds : ["__none__"] },
      },
      _count: { _all: true },
    }),
  ]);
  const byMember = new Map(records.map((r) => [r.memberId, r]));
  const lifetimeMap = new Map<string, { attended: number; absent: number }>();
  for (const row of lifetime) {
    const cur = lifetimeMap.get(row.memberId) ?? { attended: 0, absent: 0 };
    if (row.status === "Present" || row.status === "Late") {
      cur.attended += row._count._all;
    } else if (row.status === "Absent") {
      cur.absent += row._count._all;
    }
    lifetimeMap.set(row.memberId, cur);
  }

  const rows: MemberAttendanceRow[] = members.map((m) => {
    const rec = byMember.get(m.id);
    const life = lifetimeMap.get(m.id) ?? { attended: 0, absent: 0 };
    const sessions = life.attended + life.absent;
    return {
      memberId: m.id,
      fullName: m.fullName,
      unit: m.unit,
      gender: m.gender,
      status: (rec?.status as AttendanceStatus) ?? null,
      notes: rec?.notes ?? null,
      sessions,
      attended: life.attended,
      absentCount: life.absent,
      rate: sessions > 0 ? Math.round((life.attended / sessions) * 1000) / 10 : 0,
    };
  });

  const totals = summarizeStatuses(
    rows.map((r) => r.status),
    rows.length
  );

  return {
    dateKey: dateKeyStr,
    date: day,
    rows,
    totals,
    byUnit: groupByUnit(rows),
    byGender: groupByGender(rows),
  };
}

export async function getMonthCalendarSummary(
  year: number,
  month: number,
  unit?: Unit | "all"
) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const members = await getActiveMembers(unit);
  const memberIds = members.map((m) => m.id);
  const totalMembers = members.length;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      memberId: { in: memberIds.length ? memberIds : ["__none__"] },
    },
  });

  const byDay = new Map<string, { present: number; absent: number; late: number; excused: number }>();

  for (const r of records) {
    const key = dateKey(r.date);
    const bucket = byDay.get(key) ?? {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    if (r.status === "Present") bucket.present += 1;
    else if (r.status === "Absent") bucket.absent += 1;
    else if (r.status === "Late") bucket.late += 1;
    else if (r.status === "Excused") bucket.excused += 1;
    byDay.set(key, bucket);
  }

  const days: DaySummary[] = Array.from(byDay.entries()).map(([key, b]) => {
    const recorded = b.present + b.absent + b.late + b.excused;
    return {
      dateKey: key,
      present: b.present,
      absent: b.absent,
      late: b.late,
      excused: b.excused,
      unmarked: Math.max(0, totalMembers - recorded),
      totalMembers,
      recorded,
    };
  });

  return {
    year,
    month,
    monthStart,
    monthEnd,
    totalMembers,
    days,
    dayMap: Object.fromEntries(days.map((d) => [d.dateKey, d])),
  };
}

export async function getRangeReport(
  fromKey: string,
  toKey: string,
  unit?: Unit | "all"
) {
  const from = startOfDay(parseISO(fromKey));
  const to = endOfDay(parseISO(toKey));
  const members = await getActiveMembers(unit);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: from, lte: to },
      memberId: { in: members.map((m) => m.id) },
    },
    include: { member: true },
    orderBy: [{ date: "asc" }, { member: { fullName: "asc" } }],
  });

  const memberStats = members.map((m) => {
    const mine = records.filter((r) => r.memberId === m.id);
    const totals = summarizeStatuses(
      mine.map((r) => r.status as AttendanceStatus),
      undefined
    );
    // For range report per member, expected = number of distinct dates with any attendance in range
    // Better: expected = days in range when attendance was taken (unique dates with records overall)
    const sessions = totals.present + totals.absent;
    return {
      memberId: m.id,
      fullName: m.fullName,
      unit: m.unit,
      gender: m.gender,
      present: totals.present,
      absent: totals.absent,
      late: totals.late,
      excused: totals.excused,
      recorded: totals.recorded,
      sessions,
      attended: totals.present,
      absentCount: totals.absent,
      rate:
        sessions > 0
          ? Math.round((totals.present / sessions) * 1000) / 10
          : 0,
    };
  });

  const uniqueDates = Array.from(
    new Set(records.map((r) => dateKey(r.date)))
  ).sort();

  const overall = summarizeStatuses(
    records.map((r) => r.status as AttendanceStatus)
  );
  overall.expected = members.length * uniqueDates.length;
  overall.unmarked = Math.max(0, overall.expected - overall.recorded);
  overall.rate =
    overall.expected > 0
      ? Math.round((overall.present / overall.expected) * 1000) / 10
      : 0;

  const byUnit = (UNITS as Unit[]).map((u) => {
    const unitMembers = members.filter((m) => m.unit === u);
    const unitRecords = records.filter((r) => r.member.unit === u);
    const t = summarizeStatuses(unitRecords.map((r) => r.status as AttendanceStatus));
    t.expected = unitMembers.length * uniqueDates.length;
    t.unmarked = Math.max(0, t.expected - t.recorded);
    t.rate =
      t.expected > 0
        ? Math.round((t.present / t.expected) * 1000) / 10
        : 0;
    return { unit: u, label: UNIT_LABELS[u], ...t };
  });

  return {
    fromKey,
    toKey,
    uniqueDates,
    sessionCount: uniqueDates.length,
    memberCount: members.length,
    overall,
    byUnit,
    memberStats: memberStats.sort(
      (a, b) => b.present - a.present || a.fullName.localeCompare(b.fullName)
    ),
    detailRows: records.map((r) => ({
      date: dateKey(r.date),
      memberId: r.memberId,
      fullName: r.member.fullName,
      unit: r.member.unit,
      gender: r.member.gender,
      status: r.status,
      notes: r.notes,
    })),
  };
}
