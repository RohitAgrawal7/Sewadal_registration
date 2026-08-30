"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { DaySummary } from "@/lib/attendance/stats";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function AttendanceCalendar({
  year,
  month,
  selectedDateKey,
  dayMap,
  onSelectDate,
  onChangeMonth,
}: {
  year: number;
  month: number;
  selectedDateKey: string;
  dayMap: Record<string, DaySummary>;
  onSelectDate: (dateKey: string) => void;
  onChangeMonth: (year: number, month: number) => void;
}) {
  const monthDate = new Date(year, month - 1, 1);
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  function goPrev() {
    const d = subMonths(monthDate, 1);
    onChangeMonth(d.getFullYear(), d.getMonth() + 1);
  }

  function goNext() {
    const d = addMonths(monthDate, 1);
    onChangeMonth(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Calendar</h2>
          <p className="text-xs text-slate-500">Select a date to mark attendance</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" onClick={goPrev}>
            ←
          </Button>
          <p className="min-w-[8rem] text-center text-xs font-semibold text-slate-800">
            {format(monthDate, "MMMM yyyy")}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={goNext}>
            →
          </Button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const summary = dayMap[key];
          const inMonth = isSameMonth(day, monthDate);
          const selected = key === selectedDateKey;
          const today = isToday(day);
          const hasAttendance = Boolean(
            inMonth && summary && summary.recorded > 0
          );
          const segments =
            hasAttendance && summary
              ? [
                  {
                    key: "present",
                    count: summary.present,
                    className: "bg-emerald-500",
                  },
                  {
                    key: "absent",
                    count: summary.absent,
                    className: "bg-red-500",
                  },
                ].filter((s) => s.count > 0)
              : [];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              title={
                hasAttendance && summary
                  ? `${summary.present} attended, ${summary.absent} absent`
                  : undefined
              }
              className={cn(
                "flex h-8 flex-col items-center justify-center rounded-lg border px-0.5 py-0.5 transition sm:h-9",
                inMonth
                  ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  : "border-transparent bg-slate-50/50 text-slate-400",
                selected && "border-slate-900 bg-slate-50 ring-2 ring-slate-900/20",
                today && !selected && "border-amber-300 bg-amber-50/60"
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  selected
                    ? "text-slate-900"
                    : inMonth
                      ? "text-slate-700"
                      : "text-slate-400"
                )}
              >
                {format(day, "d")}
              </span>
              {hasAttendance && (
                <span className="mt-0.5 flex h-0.5 w-5 overflow-hidden rounded-full bg-slate-100">
                  {segments.map((s) => (
                    <span
                      key={s.key}
                      className={s.className}
                      style={{ flexGrow: s.count, flexBasis: 0 }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        Colored bar = attendance recorded. Session details sit below.
      </p>
    </div>
  );
}
