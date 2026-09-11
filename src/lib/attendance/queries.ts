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
import {
  computeSharedSessionStats,
  emptyMemberSessionStats,
} from "@/lib/attendance/session-stats";

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
  sessionStats: Map<number, ReturnType<typeof emptyMemberSessionStats>>,
  totalSessions: number
) {
  const byMember = new Map(records.map((r) => [r.memberId, r]));

  const rows: MemberAttendanceRow[] = members.map((m) => {
    const rec = byMember.get(m.id);
    const life =
      sessionStats.get(m.id) ?? emptyMemberSessionStats(totalSessions);
    return {
      memberId: m.id,
      fullName: m.fullName,
      unit: m.unit,
      gender: m.gender,
      sewaRole: m.sewaRole,
      registryStatus: m.registryStatus,
      status: (rec?.status as AttendanceStatus) ?? null,
      notes: rec?.notes ?? null,
      sessions: life.sessions,
      attended: life.attended,
      absentCount: life.absentCount,
      rate: life.rate,
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
    totalSessions,
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

  const { totalSessions, byMember } = await withDbRetry("sharedSessionStats", () =>
    computeSharedSessionStats(db, memberIds)
  );

  return buildDayPayload(
    dateKeyStr,
    day,
    members,
    records,
    byMember,
    totalSessions
  );
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

  const uniqueDates = Array.from(
    new Set(records.map((r) => dateKey(r.date)))
  ).sort();
  const rangeSessions = uniqueDates.length;

  const byMemberId = new Map<number, typeof records>();
  for (const r of records) {
    const list = byMemberId.get(r.memberId);
    if (list) list.push(r);
    else byMemberId.set(r.memberId, [r]);
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  const memberStats = members.map((m) => {
    const mine = byMemberId.get(m.id) ?? [];
    let attended = 0;
    let late = 0;
    let excused = 0;
    let present = 0;
    let absentMarked = 0;
    for (const r of mine) {
      if (r.status === "Present") {
        present += 1;
        attended += 1;
      } else if (r.status === "Late") {
        late += 1;
        attended += 1;
      } else if (r.status === "Absent") {
        absentMarked += 1;
      } else if (r.status === "Excused") {
        excused += 1;
      }
    }
    attended = Math.min(attended, rangeSessions);
    const absentCount = Math.max(0, rangeSessions - attended);
    return {
      memberId: m.id,
      fullName: m.fullName,
      unit: m.unit,
      gender: m.gender,
      present,
      absent: absentCount,
      late,
      excused,
      recorded: present + absentMarked + late + excused,
      sessions: rangeSessions,
      attended,
      absentCount,
      rate:
        rangeSessions > 0
          ? Math.round((attended / rangeSessions) * 1000) / 10
          : 0,
    };
  });

  const overall = summarizeStatuses(
    records.map((r) => r.status as AttendanceStatus)
  );
  overall.expected = members.length * rangeSessions;
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
    t.expected = unitMembers.length * rangeSessions;
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
 * Fast initial /attendance loader: members + selected day + month calendar + session.
 * Range report is loaded lazily when the user opens that panel.
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

    const { totalSessions, byMember } = await computeSharedSessionStats(
      db,
      memberIds
    );

    const dayData = buildDayPayload(
      input.dateKey,
      day,
      members,
      dayRecords,
      byMember,
      totalSessions
    );

    const calendar = await getMonthCalendarSummary(
      input.year,
      input.month,
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

    // Placeholder — range is fetched on demand for faster first paint / date changes.
    const rangeData = {
      fromKey: input.fromKey,
      toKey: input.toKey,
      uniqueDates: [] as string[],
      sessionCount: 0,
      memberCount: members.length,
      overall: summarizeStatuses([], members.length),
      byUnit: (UNITS as Unit[]).map((u) => ({
        unit: u,
        label: UNIT_LABELS[u],
        ...summarizeStatuses([], members.filter((m) => m.unit === u).length),
      })),
      memberStats: [] as Awaited<ReturnType<typeof getRangeReport>>["memberStats"],
      detailRows: [] as Awaited<ReturnType<typeof getRangeReport>>["detailRows"],
    };

    return { calendar, dayData, rangeData, searchMembers, session };
  });
}

/** Light reload for date / unit / month changes (no range report). */
export async function getAttendanceSlice(input: {
  dateKey: string;
  unit: Unit | "all";
  year: number;
  month: number;
}) {
  return withDbRetry("getAttendanceSlice", async () => {
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

    const { totalSessions, byMember } = await computeSharedSessionStats(
      db,
      memberIds
    );

    const dayData = buildDayPayload(
      input.dateKey,
      day,
      members,
      dayRecords,
      byMember,
      totalSessions
    );

    const calendar = await getMonthCalendarSummary(
      input.year,
      input.month,
      input.unit,
      members
    );

    const session = await db.attendanceSession.findUnique({
      where: { date: day },
    });

    return {
      dayData,
      dayMap: calendar.dayMap,
      year: calendar.year,
      month: calendar.month,
      session: session
        ? {
            topic: session.topic,
            sanchalanSewa: session.sanchalanSewa,
            stageSewa: session.stageSewa,
          }
        : null,
      searchMembers: members.map((m) => ({
        ...m,
        dateOfBirth: m.dateOfBirth.toISOString(),
      })),
    };
  });
}
