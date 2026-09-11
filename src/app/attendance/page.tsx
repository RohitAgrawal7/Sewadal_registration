import { getAttendancePageData } from "@/lib/attendance/queries";
import { todayKey } from "@/lib/attendance/date-utils";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import type { Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import type { AttendanceTotals } from "@/lib/attendance/stats";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { publicDbError } from "@/lib/db/helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function parseUnit(value: string | undefined): Unit | "all" {
  if (value && (UNITS as string[]).includes(value)) return value as Unit;
  return "all";
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
  let calendar: Awaited<
    ReturnType<typeof getAttendancePageData>
  >["calendar"];
  let dayData: Awaited<ReturnType<typeof getAttendancePageData>>["dayData"];
  let rangeData: Awaited<
    ReturnType<typeof getAttendancePageData>
  >["rangeData"];
  let searchMembers: Awaited<
    ReturnType<typeof getAttendancePageData>
  >["searchMembers"];
  let session: Awaited<ReturnType<typeof getAttendancePageData>>["session"];

  try {
    const bundle = await getAttendancePageData({
      dateKey: selectedDate,
      unit,
      year,
      month,
      fromKey: from,
      toKey: to,
    });
    calendar = bundle.calendar;
    dayData = bundle.dayData;
    rangeData = bundle.rangeData;
    searchMembers = bundle.searchMembers;
    session = bundle.session;
  } catch (error) {
    console.error("Attendance page data failed during build/runtime", error);
    loadError = publicDbError(
      error,
      "Could not load attendance from the database"
    );
    const ms = new Date(Date.UTC(year, month - 1, 1));
    const me = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
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
      totalSessions: 0,
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
