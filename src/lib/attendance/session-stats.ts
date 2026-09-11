import type { PrismaClient } from "@/generated/prisma";
import { dateKey } from "@/lib/attendance/date-utils";

export type MemberSessionStats = {
  /** Shared total — same for every member. */
  sessions: number;
  attended: number;
  absentCount: number;
  rate: number;
};

/**
 * Total sessions = unique dates attendance was held (AttendanceSession ∪ AttendanceRecord dates).
 * Attended = Present + Late for that member.
 * Absent = sessions − attended (unmarked days count as absent so totals align).
 */
export async function computeSharedSessionStats(
  db: PrismaClient,
  memberIds: number[]
): Promise<{ totalSessions: number; byMember: Map<number, MemberSessionStats> }> {
  const [sessionRows, recordDateRows, grouped] = await Promise.all([
    db.attendanceSession.findMany({ select: { date: true } }),
    db.attendanceRecord.findMany({
      distinct: ["date"],
      select: { date: true },
    }),
    memberIds.length
      ? db.attendanceRecord.groupBy({
          by: ["memberId", "status"],
          where: { memberId: { in: memberIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const dateKeys = new Set<string>();
  for (const row of sessionRows) dateKeys.add(dateKey(row.date));
  for (const row of recordDateRows) dateKeys.add(dateKey(row.date));
  const totalSessions = dateKeys.size;

  const attendedMap = new Map<number, number>();
  for (const row of grouped) {
    if (row.status === "Present" || row.status === "Late") {
      attendedMap.set(
        row.memberId,
        (attendedMap.get(row.memberId) ?? 0) + row._count._all
      );
    }
  }

  const byMember = new Map<number, MemberSessionStats>();
  for (const id of memberIds) {
    const attended = Math.min(attendedMap.get(id) ?? 0, totalSessions);
    const absentCount = Math.max(0, totalSessions - attended);
    byMember.set(id, {
      sessions: totalSessions,
      attended,
      absentCount,
      rate:
        totalSessions > 0
          ? Math.round((attended / totalSessions) * 1000) / 10
          : 0,
    });
  }

  return { totalSessions, byMember };
}

export function emptyMemberSessionStats(
  totalSessions = 0
): MemberSessionStats {
  return {
    sessions: totalSessions,
    attended: 0,
    absentCount: totalSessions,
    rate: 0,
  };
}
