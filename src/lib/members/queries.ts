import { readyPrisma } from "@/lib/prisma";
import { withDerived, type MemberAttendanceStats } from "@/lib/dates";
import type { Unit } from "@/lib/enums";
import { MembershipStatus, UNITS, MEMBERSHIP_STATUSES } from "@/lib/enums";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Member } from "@/generated/prisma";
import { withDbRetry } from "@/lib/db/helpers";
import { computeSharedSessionStats } from "@/lib/attendance/session-stats";

function isUnit(value: string): value is Unit {
  return (UNITS as string[]).includes(value);
}

function withAttendance(
  member: Member,
  stats: { attended: number; absentCount: number; sessions: number; rate: number } | undefined,
  totalSessions: number
) {
  const attended = stats?.attended ?? 0;
  const absent = stats?.absentCount ?? totalSessions;
  const recorded = totalSessions;
  const attendance: MemberAttendanceStats = {
    attended,
    absent,
    recorded,
    rate:
      stats?.rate ??
      (recorded > 0 ? Math.round((attended / recorded) * 1000) / 10 : 0),
  };
  return { ...withDerived(member), attendance };
}

export async function getAllMembers() {
  return withDbRetry("getAllMembers", async () => {
    const db = await readyPrisma();
    const members = await db.member.findMany({
      orderBy: { fullName: "asc" },
    });
    const { totalSessions, byMember } = await computeSharedSessionStats(
      db,
      members.map((m) => m.id)
    );
    return members.map((m) =>
      withAttendance(m, byMember.get(m.id), totalSessions)
    );
  });
}

export async function getMemberById(id: string | number) {
  const { parseMemberId } = await import("@/lib/members/ids");
  const numericId = parseMemberId(id);
  if (!numericId) return null;
  return withDbRetry("getMemberById", async () => {
    const db = await readyPrisma();
    const member = await db.member.findUnique({
      where: { id: numericId },
      include: {
        unitHistory: { orderBy: { startDate: "desc" } },
      },
    });
    if (!member) return null;
    return withDerived(member);
  });
}

export async function getDashboardStats() {
  return withDbRetry("getDashboardStats", async () => {
    const db = await readyPrisma();
    const members = await db.member.findMany({
      orderBy: { fullName: "asc" },
    });
    const { totalSessions, byMember } = await computeSharedSessionStats(
      db,
      members.map((m) => m.id)
    );
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const byUnit: Record<Unit, number> = {
      Unit1: 0,
      Unit2: 0,
      Unit3: 0,
      Unit4: 0,
    };

    let active = 0;
    let newThisMonth = 0;

    for (const m of members) {
      if (isUnit(m.unit)) byUnit[m.unit] += 1;
      if (m.membershipStatus === MembershipStatus.Active) active += 1;
      if (m.registrationDate >= monthStart && m.registrationDate <= monthEnd) {
        newThisMonth += 1;
      }
    }

    return {
      total: members.length,
      active,
      byUnit,
      newThisMonth,
      totalSessions,
      members: members.map((m) =>
        withAttendance(m, byMember.get(m.id), totalSessions)
      ),
    };
  });
}

export function parseUnitFilter(value: string | undefined): Unit | undefined {
  if (!value) return undefined;
  return isUnit(value) ? value : undefined;
}

export function parseStatusFilter(
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return (MEMBERSHIP_STATUSES as string[]).includes(value) ? value : undefined;
}
