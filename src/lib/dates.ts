import {
  differenceInCalendarDays,
  differenceInYears,
  endOfWeek,
  format,
  getMonth,
  getDate,
  isSameDay,
  isWithinInterval,
  setYear,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { Member } from "@prisma/client";

export type TenureParts = {
  years: number;
  months: number;
  days: number;
};

export type MemberDerived = {
  age: number;
  tenureInOrg: TenureParts;
  tenureInOrgLabel: string;
  tenureInCurrentUnit: TenureParts;
  tenureInCurrentUnitLabel: string;
  daysUntilNextBirthday: number;
  nextBirthdayDate: Date;
  isBirthdayToday: boolean;
  isBirthdayThisWeek: boolean;
  isBirthdayThisMonth: boolean;
  turningAge: number;
};

export type MemberAttendanceStats = {
  attended: number;
  absent: number;
  recorded: number;
  rate: number;
};

export const EMPTY_ATTENDANCE: MemberAttendanceStats = {
  attended: 0,
  absent: 0,
  recorded: 0,
  rate: 0,
};

export type MemberWithDerived<T extends Member = Member> = T & {
  derived: MemberDerived;
  attendance?: MemberAttendanceStats;
};

export type BirthdayBuckets<T extends Member = Member> = {
  today: MemberWithDerived<T>[];
  thisWeek: MemberWithDerived<T>[];
  thisMonth: MemberWithDerived<T>[];
  nextUpcoming: MemberWithDerived<T> | null;
};

function startOfToday(today?: Date): Date {
  return startOfDay(today ?? new Date());
}

/** Full years of age from date of birth. */
export function computeAge(dob: Date, today?: Date): number {
  return differenceInYears(startOfToday(today), startOfDay(dob));
}

/** Calendar tenure broken into years / months / days. */
export function tenureBetween(start: Date, end?: Date): TenureParts {
  const from = startOfDay(start);
  const to = startOfDay(end ?? new Date());

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export function formatTenure(parts: TenureParts): string {
  const bits: string[] = [];
  if (parts.years > 0) bits.push(`${parts.years}y`);
  if (parts.months > 0) bits.push(`${parts.months}m`);
  if (parts.days > 0 || bits.length === 0) bits.push(`${parts.days}d`);
  return bits.join(" ");
}

/** Next birthday occurrence on or after today (today if birthday is today). */
export function nextBirthdayDate(dob: Date, today?: Date): Date {
  const now = startOfToday(today);
  const birth = startOfDay(dob);
  let next = setYear(birth, now.getFullYear());
  // Handle Feb 29 → Mar 1 in non-leap years via setYear behavior on Date
  if (getMonth(birth) === 1 && getDate(birth) === 29) {
    const leap = new Date(now.getFullYear(), 1, 29);
    if (leap.getMonth() !== 1) {
      next = new Date(now.getFullYear(), 2, 1);
    }
  }
  if (next < now) {
    next = setYear(birth, now.getFullYear() + 1);
    if (getMonth(birth) === 1 && getDate(birth) === 29) {
      const leap = new Date(now.getFullYear() + 1, 1, 29);
      if (leap.getMonth() !== 1) {
        next = new Date(now.getFullYear() + 1, 2, 1);
      }
    }
  }
  return startOfDay(next);
}

export function daysUntilNextBirthday(dob: Date, today?: Date): number {
  const now = startOfToday(today);
  return differenceInCalendarDays(nextBirthdayDate(dob, now), now);
}

export function isBirthdayToday(dob: Date, today?: Date): boolean {
  return daysUntilNextBirthday(dob, today) === 0;
}

/** Remaining days in the current Mon–Sun week, including today. */
export function isBirthdayThisWeek(dob: Date, today?: Date): boolean {
  const now = startOfToday(today);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const next = nextBirthdayDate(dob, now);
  return isWithinInterval(next, { start: weekStart, end: weekEnd });
}

export function isBirthdayThisMonth(dob: Date, today?: Date): boolean {
  const now = startOfToday(today);
  const next = nextBirthdayDate(dob, now);
  return next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth();
}

export function withDerived<T extends Member>(
  member: T,
  today?: Date
): MemberWithDerived<T> {
  const now = startOfToday(today);
  const age = computeAge(member.dateOfBirth, now);
  const days = daysUntilNextBirthday(member.dateOfBirth, now);
  const next = nextBirthdayDate(member.dateOfBirth, now);
  const tenureInOrg = tenureBetween(member.registrationDate, now);
  const tenureInCurrentUnit = tenureBetween(member.unitAssignedDate, now);

  return {
    ...member,
    derived: {
      age,
      tenureInOrg,
      tenureInOrgLabel: formatTenure(tenureInOrg),
      tenureInCurrentUnit,
      tenureInCurrentUnitLabel: formatTenure(tenureInCurrentUnit),
      daysUntilNextBirthday: days,
      nextBirthdayDate: next,
      isBirthdayToday: days === 0,
      isBirthdayThisWeek: isBirthdayThisWeek(member.dateOfBirth, now),
      isBirthdayThisMonth: isBirthdayThisMonth(member.dateOfBirth, now),
      turningAge: age + (days === 0 ? 0 : 1),
    },
  };
}

export function bucketBirthdays<T extends Member>(
  members: T[],
  today?: Date
): BirthdayBuckets<T> {
  const now = startOfToday(today);
  const withD = members.map((m) => withDerived(m, now));

  const todayList = withD
    .filter((m) => m.derived.isBirthdayToday)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const thisWeek = withD
    .filter((m) => m.derived.isBirthdayThisWeek && !m.derived.isBirthdayToday)
    .sort(
      (a, b) =>
        a.derived.daysUntilNextBirthday - b.derived.daysUntilNextBirthday
    );

  const thisMonth = withD
    .filter(
      (m) =>
        m.derived.isBirthdayThisMonth &&
        !m.derived.isBirthdayThisWeek &&
        !m.derived.isBirthdayToday
    )
    .sort(
      (a, b) =>
        a.derived.daysUntilNextBirthday - b.derived.daysUntilNextBirthday
    );

  const hasAnyThisMonth = withD.some((m) => m.derived.isBirthdayThisMonth);
  let nextUpcoming: MemberWithDerived<T> | null = null;
  if (!hasAnyThisMonth) {
    const upcoming = [...withD].sort(
      (a, b) =>
        a.derived.daysUntilNextBirthday - b.derived.daysUntilNextBirthday
    );
    nextUpcoming = upcoming[0] ?? null;
  }

  return { today: todayList, thisWeek, thisMonth, nextUpcoming };
}

export function formatBirthdayChip(member: MemberWithDerived): string {
  const dateLabel = format(member.dateOfBirth, "MMMM d");
  const { daysUntilNextBirthday: days, turningAge } = member.derived;
  if (days === 0) {
    return `🎂 ${dateLabel} (Turns ${turningAge} today)`;
  }
  return `🎂 ${dateLabel} (Turns ${turningAge} in ${days} day${days === 1 ? "" : "s"})`;
}

export function formatCompactBirthdayRow(
  member: MemberWithDerived
): string {
  return `${format(member.derived.nextBirthdayDate, "MMM d")} — ${member.fullName} turns ${member.derived.turningAge}`;
}

export function averageTenureDays(
  members: { unitAssignedDate: Date }[],
  today?: Date
): number {
  if (members.length === 0) return 0;
  const now = startOfToday(today);
  const total = members.reduce(
    (sum, m) => sum + differenceInCalendarDays(now, startOfDay(m.unitAssignedDate)),
    0
  );
  return Math.round(total / members.length);
}

export function formatAverageTenureDays(days: number): string {
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const rem = days % 30;
  if (months < 12) return rem > 0 ? `${months}m ${rem}d` : `${months}m`;
  const years = Math.floor(months / 12);
  const remM = months % 12;
  return remM > 0 ? `${years}y ${remM}m` : `${years}y`;
}

export { isSameDay, format };

function asDate(value: Date | string | null | undefined, fallback?: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}

/** Revive dates after a server action and recompute derived fields. */
export function hydrateMember(
  raw: Member & { attendance?: MemberAttendanceStats }
): MemberWithDerived {
  const member = withDerived({
    ...raw,
    dateOfBirth: asDate(raw.dateOfBirth),
    unitAssignedDate: asDate(raw.unitAssignedDate),
    registrationDate: asDate(raw.registrationDate),
    statusEffectiveDate: asDate(raw.statusEffectiveDate),
    lastRenewalDate: raw.lastRenewalDate
      ? asDate(raw.lastRenewalDate)
      : null,
    createdAt: asDate(raw.createdAt),
    updatedAt: asDate(raw.updatedAt),
  });
  return {
    ...member,
    attendance: raw.attendance ?? EMPTY_ATTENDANCE,
  };
}
