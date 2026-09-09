import {
  getAttendanceForDate,
  getAttendanceSession,
  getMembersForSearch,
  getMonthCalendarSummary,
  getRangeReport,
} from "@/lib/attendance/queries";
import { todayKey } from "@/lib/attendance/date-utils";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import type { Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import type { AttendanceTotals } from "@/lib/attendance/stats";
import { endOfMonth, format, startOfMonth } from "date-fns";

const EMPTY_TOTALS: AttendanceTotals = {
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  unmarked: 0,
  recorded: 0,
  expected: 0,
  rate: 0,
};

export const dynamic = "force-dynamic";

function parseUnit(value: string | undefined): Unit | "all" {
  if (value && (UNITS as string[]).includes(value)) return value as Unit;
  return "all";
}

function dbErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (/DATABASE_URL|Can't reach database|P1001|P1000/i.test(msg)) {
    return "Database is unavailable. Check DATABASE_URL (Supabase pooler) and that schema sewadal exists (npx prisma db push).";
  }
  if (/sewadal|does not exist|P2021/i.test(msg)) {
    return "Database tables are missing in schema sewadal. Run: npx prisma db push";
  }
  return "Could not load attendance from the database. Refresh or check server logs.";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: {
    date?: string;
    unit?: string;
    year?: string;
    month?: string;
    from?: string;
    to?: string;
  };
}) {
  const today = new Date();
  const unit = parseUnit(searchParams.unit);
  const selectedDate =
    searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)
      ? searchParams.date
      : todayKey(today);

  const selected = new Date(selectedDate + "T12:00:00");
  const year = Number(searchParams.year) || selected.getFullYear();
  const month = Number(searchParams.month) || selected.getMonth() + 1;

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const from =
    searchParams.from && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from)
      ? searchParams.from
      : format(monthStart, "yyyy-MM-dd");
  const to =
    searchParams.to && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.to)
      ? searchParams.to
      : format(monthEnd, "yyyy-MM-dd");

  let loadError: string | null = null;
  let calendar: Awaited<ReturnType<typeof getMonthCalendarSummary>>;
  let dayData: Awaited<ReturnType<typeof getAttendanceForDate>>;
  let rangeData: Awaited<ReturnType<typeof getRangeReport>>;
  let searchMembers: Awaited<ReturnType<typeof getMembersForSearch>>;
  let session: Awaited<ReturnType<typeof getAttendanceSession>>;

  try {
    [calendar, dayData, rangeData, searchMembers, session] = await Promise.all([
      getMonthCalendarSummary(year, month, unit),
      getAttendanceForDate(selectedDate, unit),
      getRangeReport(from, to, unit),
      getMembersForSearch(),
      getAttendanceSession(selectedDate),
    ]);
  } catch (error) {
    console.error("Attendance page data failed during build/runtime", error);
    loadError = dbErrorMessage(error);
    const { monthStart: ms, monthEnd: me } = (() => {
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      return { monthStart, monthEnd };
    })();
    calendar = {
      year,
      month,
      monthStart: ms,
      monthEnd: me,
      totalMembers: 0,
      days: [],
      dayMap: {},
    };
    dayData = {
      dateKey: selectedDate,
      date: new Date(`${selectedDate}T00:00:00.000Z`),
      rows: [],
      totals: EMPTY_TOTALS,
      byUnit: [],
      byGender: [],
    };
    rangeData = {
      fromKey: from,
      toKey: to,
      uniqueDates: [],
      sessionCount: 0,
      memberCount: 0,
      overall: EMPTY_TOTALS,
      byUnit: [],
      memberStats: [],
      detailRows: [],
    };
    searchMembers = [];
    session = null;
  }

  return (
    <AttendanceClient
      initialDateKey={selectedDate}
      unit={unit}
      year={year}
      month={month}
      dayMap={calendar.dayMap}
      dayData={{
        dateKey: dayData.dateKey,
        rows: dayData.rows,
        totals: dayData.totals,
        byUnit: dayData.byUnit,
        byGender: dayData.byGender,
      }}
      rangeData={{
        fromKey: rangeData.fromKey,
        toKey: rangeData.toKey,
        sessionCount: rangeData.sessionCount,
        memberCount: rangeData.memberCount,
        overall: rangeData.overall,
        byUnit: rangeData.byUnit,
        memberStats: rangeData.memberStats,
      }}
      searchMembers={searchMembers}
      loadError={loadError}
      session={
        session
          ? {
              topic: session.topic,
              sanchalanSewa: session.sanchalanSewa,
              stageSewa: session.stageSewa,
            }
          : null
      }
    />
  );
}
