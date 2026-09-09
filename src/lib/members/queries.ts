import { readyPrisma } from "@/lib/prisma";
import { withDerived, type MemberAttendanceStats } from "@/lib/dates";
import type { Unit } from "@/lib/enums";
import { MembershipStatus, UNITS, MEMBERSHIP_STATUSES } from "@/lib/enums";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Member } from "@/generated/prisma";
import { withDbRetry } from "@/lib/db/helpers";

function isUnit(value: string): value is Unit {
  return (UNITS as string[]).includes(value);
}

async function attendanceByMemberId(
  db: Awaited<ReturnType<typeof readyPrisma>>
) {
  const grouped = await db.attendanceRecord.groupBy({
    by: ["memberId", "status"],
    _count: { _all: true },
  });
  const map = new Map<number, { attended: number; absent: number }>();
  for (const row of grouped) {
    const cur = map.get(row.memberId) ?? { attended: 0, absent: 0 };
    if (row.status === "Present" || row.status === "Late") {
      cur.attended += row._count._all;
    } else if (row.status === "Absent") {
      cur.absent += row._count._all;
    }
    map.set(row.memberId, cur);
  }
  return map;
}

function withAttendance(
  member: Member,
  map: Map<number, { attended: number; absent: number }>
) {
  const c = map.get(member.id) ?? { attended: 0, absent: 0 };
  const recorded = c.attended + c.absent;
  const attendance: MemberAttendanceStats = {
    attended: c.attended,
    absent: c.absent,
    recorded,
    rate: recorded > 0 ? Math.round((c.attended / recorded) * 1000) / 10 : 0,
  };
  return { ...withDerived(member), attendance };
}

export async function getAllMembers() {
  return withDbRetry("getAllMembers", async () => {
    const db = await readyPrisma();
    // Sequential: one pooler connection — avoids stampedes with 100+ members.
    const members = await db.member.findMany({
      orderBy: { fullName: "asc" },
    });
    const attendanceMap = await attendanceByMemberId(db);
    return members.map((m) => withAttendance(m, attendanceMap));
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
    const attendanceMap = await attendanceByMemberId(db);
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
      members: members.map((m) => withAttendance(m, attendanceMap)),
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
