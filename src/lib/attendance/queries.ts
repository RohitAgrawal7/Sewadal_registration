import { Prisma } from "@/generated/prisma";
import { readyPrisma } from "@/lib/prisma";
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
import {
  dateKey,
  parseDateKey,
  parseDateKeyEnd,
  utcMonthBounds,
} from "@/lib/attendance/date-utils";
import { idInFilter, withDbRetry } from "@/lib/db/helpers";

export { dateKey, parseDateKey } from "@/lib/attendance/date-utils";

const MEMBER_LIST_SELECT = {
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
  sewaRole: true,
  registryStatus: true,
} satisfies Prisma.MemberSelect;

type MemberListRow = Prisma.MemberGetPayload<{ select: typeof MEMBER_LIST_SELECT }>;

async function loadMembers(
  unit?: Unit | "all"
): Promise<MemberListRow[]> {
  const db = await readyPrisma();
  return withDbRetry("loadMembers", () =>
    db.member.findMany({
      where: unit && unit !== "all" ? { unit } : undefined,
      select: MEMBER_LIST_SELECT,
      orderBy: [{ unit: "asc" }, { fullName: "asc" }],
    })
  );
}

/** Members for attendance marking (selected fields only — scales past 100+). */
export async function getActiveMembers(unit?: Unit | "all") {
  return loadMembers(unit);
}

export async function getMembersForSearch() {
  const members = await loadMembers("all");
  return members.map((m) => ({
    ...m,
    dateOfBirth: m.dateOfBirth.toISOString(),
  }));
}

export async function getAttendanceSession(dateKeyStr: string) {
  const db = await readyPrisma();
  const day = parseDateKey(dateKeyStr);
  return withDbRetry("getAttendanceSession", () =>
    db.attendanceSession.findUnique({ where: { date: day } })
  );
}

function buildDayPayload(
  dateKeyStr: string,
  day: Date,
  members: MemberListRow[],
  records: Array<{ memberId: number; status: string; notes: string | null }>,
  lifetime: Array<{ memberId: number; status: string; _count: { _all: number } }>
) {
  const byMember = new Map(records.map((r) => [r.memberId, r]));
  const lifetimeMap = new Map<number, { attended: number; absent: number }>();
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
      sewaRole: m.sewaRole,
      registryStatus: m.registryStatus,
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

export async function getAttendanceForDate(
  dateKeyStr: string,
  unit?: Unit | "all"
) {
  const db = await readyPrisma();
  const day = parseDateKey(dateKeyStr);
  const members = await loadMembers(unit);
  const memberIds = members.map((m) => m.id);
  const idFilter = idInFilter(memberIds);

  const records = idFilter
    ? await withDbRetry("dayRecords", () =>
        db.attendanceRecord.findMany({
          where: { date: day, memberId: idFilter },
          select: { memberId: true, status: true, notes: true },
        })
      )
    : [];

  const lifetime = idFilter
    ? await withDbRetry("lifetimeStats", () =>
        db.attendanceRecord.groupBy({
          by: ["memberId", "status"],
          where: { memberId: idFilter },
          _count: { _all: true },
        })
      )
    : [];

  return buildDayPayload(dateKeyStr, day, members, records, lifetime);
}

export async function getMonthCalendarSummary(
  year: number,
  month: number,
  unit?: Unit | "all",
  preloadedMembers?: MemberListRow[]
) {
  const db = await readyPrisma();
  const { monthStart, monthEnd } = utcMonthBounds(year, month);
  const members = preloadedMembers ?? (await loadMembers(unit));
  const memberIds = members.map((m) => m.id);
  const totalMembers = members.length;
  const idFilter = idInFilter(memberIds);

  const records = idFilter
    ? await withDbRetry("monthRecords", () =>
        db.attendanceRecord.findMany({
          where: {
            date: { gte: monthStart, lte: monthEnd },
            memberId: idFilter,
          },
          select: { date: true, status: true },
        })
      )
    : [];

  const byDay = new Map<
    string,
    { present: number; absent: number; late: number; excused: number }
  >();

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
  unit?: Unit | "all",
  preloadedMembers?: MemberListRow[]
) {
  const db = await readyPrisma();
  const from = parseDateKey(fromKey);
  const to = parseDateKeyEnd(toKey);
  const members = preloadedMembers ?? (await loadMembers(unit));
  const memberIds = members.map((m) => m.id);
  const idFilter = idInFilter(memberIds);

  const records = idFilter
    ? await withDbRetry("rangeRecords", () =>
        db.attendanceRecord.findMany({
          where: {
            date: { gte: from, lte: to },
            memberId: idFilter,
          },
          select: {
            date: true,
            memberId: true,
            status: true,
            notes: true,
          },
          orderBy: [{ date: "asc" }, { memberId: "asc" }],
        })
      )
    : [];

  const byMemberId = new Map<number, typeof records>();
  for (const r of records) {
    const list = byMemberId.get(r.memberId);
    if (list) list.push(r);
    else byMemberId.set(r.memberId, [r]);
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  const memberStats = members.map((m) => {
    const mine = byMemberId.get(m.id) ?? [];
    const totals = summarizeStatuses(
      mine.map((r) => r.status as AttendanceStatus),
      undefined
    );
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
    const unitRecords = records.filter(
      (r) => memberById.get(r.memberId)?.unit === u
    );
    const t = summarizeStatuses(
      unitRecords.map((r) => r.status as AttendanceStatus)
    );
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
    detailRows: records.map((r) => {
      const m = memberById.get(r.memberId);
      return {
        date: dateKey(r.date),
        memberId: r.memberId,
        fullName: m?.fullName ?? "—",
        unit: m?.unit ?? "—",
        gender: m?.gender ?? null,
        status: r.status,
        notes: r.notes,
      };
    }),
  };
}

/**
 * Single connection-friendly loader for /attendance.
 * Loads members once, then day/month/range/session sequentially (safe with pooler).
 */
export async function getAttendancePageData(input: {
  dateKey: string;
  unit: Unit | "all";
  year: number;
  month: number;
  fromKey: string;
  toKey: string;
}) {
  return withDbRetry("getAttendancePageData", async () => {
    const db = await readyPrisma();
    const day = parseDateKey(input.dateKey);
    const members = await loadMembers(input.unit);
    const memberIds = members.map((m) => m.id);
    const idFilter = idInFilter(memberIds);

    const dayRecords = idFilter
      ? await db.attendanceRecord.findMany({
          where: { date: day, memberId: idFilter },
          select: { memberId: true, status: true, notes: true },
        })
      : [];

    const lifetime = idFilter
      ? await db.attendanceRecord.groupBy({
          by: ["memberId", "status"],
          where: { memberId: idFilter },
          _count: { _all: true },
        })
      : [];

    const dayData = buildDayPayload(
      input.dateKey,
      day,
      members,
      dayRecords,
      lifetime
    );

    const calendar = await getMonthCalendarSummary(
      input.year,
      input.month,
      input.unit,
      members
    );
    const rangeData = await getRangeReport(
      input.fromKey,
      input.toKey,
      input.unit,
      members
    );
    const session = await db.attendanceSession.findUnique({
      where: { date: day },
    });

    const searchMembers = members.map((m) => ({
      ...m,
      dateOfBirth: m.dateOfBirth.toISOString(),
    }));

    return { calendar, dayData, rangeData, searchMembers, session };
  });
}
