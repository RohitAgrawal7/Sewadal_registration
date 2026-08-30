import {
  getAttendanceForDate,
  getAttendanceSession,
  getMembersForSearch,
  getMonthCalendarSummary,
  getRangeReport,
} from "@/lib/attendance/queries";
import { dateKey } from "@/lib/attendance/date-utils";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";
import type { Unit } from "@/lib/enums";
import { UNITS } from "@/lib/enums";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

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
      : dateKey(today);

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

  const [calendar, dayData, rangeData, searchMembers, session] =
    await Promise.all([
      getMonthCalendarSummary(year, month, unit),
      getAttendanceForDate(selectedDate, unit),
      getRangeReport(from, to, unit),
      getMembersForSearch(),
      getAttendanceSession(selectedDate),
    ]);

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
