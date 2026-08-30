"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { DaySummary } from "@/lib/attendance/stats";
import type {
  GenderAttendanceBreakdown,
  MemberAttendanceRow,
  UnitAttendanceBreakdown,
  AttendanceTotals,
} from "@/lib/attendance/stats";
import {
  attendancePdfFile,
  type AttendancePdfFile,
} from "@/lib/attendance/pdf";
import { AttendancePdfPreview } from "./AttendancePdfPreview";
import { formatPaRate } from "@/lib/attendance/stats";
import { dateKey } from "@/lib/attendance/date-utils";
import { ALL_UNITS, UNIT_COLORS, UNIT_LABELS } from "@/lib/unit-colors";
import { orgSettings } from "@/lib/org-settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { AttendanceEntryForm, AttendanceSessionDetails, type SearchMember } from "./AttendanceEntryForm";
import { AttendanceMarkPanel } from "./AttendanceMarkPanel";
import { AttendanceSummaryCards } from "./AttendanceSummaryCards";

type DayPayload = {
  dateKey: string;
  rows: MemberAttendanceRow[];
  totals: AttendanceTotals;
  byUnit: UnitAttendanceBreakdown[];
  byGender: GenderAttendanceBreakdown[];
};

type RangePayload = {
  fromKey: string;
  toKey: string;
  sessionCount: number;
  memberCount: number;
  overall: AttendanceTotals;
  byUnit: Array<
    {
      unit: string;
      label: string;
    } & AttendanceTotals
  >;
  memberStats: Array<{
    memberId: string;
    fullName: string;
    unit: string;
    gender: string | null;
    present: number;
    absent: number;
    late: number;
    excused: number;
    recorded: number;
    sessions: number;
    attended: number;
    absentCount: number;
    rate: number;
  }>;
};

export function AttendanceClient({
  initialDateKey,
  unit,
  year,
  month,
  dayMap,
  dayData,
  rangeData,
  searchMembers,
  session,
}: {
  initialDateKey: string;
  unit: string;
  year: number;
  month: number;
  dayMap: Record<string, DaySummary>;
  dayData: DayPayload;
  rangeData: RangePayload;
  searchMembers: SearchMember[];
  session: {
    topic: string | null;
    sanchalanSewa: string | null;
    stageSewa: string | null;
  } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [fromKey, setFromKey] = useState(rangeData.fromKey);
  const [toKey, setToKey] = useState(rangeData.toKey);
  const [livePresent, setLivePresent] = useState<MemberAttendanceRow[]>([]);
  const [showRangeReport, setShowRangeReport] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<AttendancePdfFile | null>(null);
  const returnTo = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    setFromKey(rangeData.fromKey);
    setToKey(rangeData.toKey);
  }, [rangeData.fromKey, rangeData.toKey]);

  useEffect(() => {
    setLivePresent([]);
  }, [initialDateKey]);

  useEffect(() => {
    const presentIds = new Set(
      dayData.rows
        .filter((r) => r.status === "Present")
        .map((r) => r.memberId)
    );
    setLivePresent((current) =>
      current.filter((r) => !presentIds.has(r.memberId))
    );
  }, [dayData.rows]);

  const markRows = useMemo(() => {
    const byId = new Map(dayData.rows.map((r) => [r.memberId, r]));
    for (const row of livePresent) {
      byId.set(row.memberId, { ...byId.get(row.memberId), ...row });
    }
    return [...byId.values()];
  }, [dayData.rows, livePresent]);

  function addPresentToList(row: MemberAttendanceRow) {
    const existing = dayData.rows.find((r) => r.memberId === row.memberId);
    const attended = (existing?.attended ?? row.attended ?? 0) + (
      existing?.status === "Present" ? 0 : 1
    );
    const absentCount = existing?.absentCount ?? row.absentCount ?? 0;
    const sessions = attended + absentCount;
    const next: MemberAttendanceRow = {
      ...row,
      sessions,
      attended,
      absentCount,
      rate: sessions > 0 ? Math.round((attended / sessions) * 1000) / 10 : 0,
    };
    setLivePresent((current) => {
      const without = current.filter((r) => r.memberId !== next.memberId);
      return [...without, next];
    });
    requestAnimationFrame(() => {
      document
        .getElementById("todays-present")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function pushParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const monthLabel = useMemo(
    () => format(new Date(year, month - 1, 1), "MMMM yyyy"),
    [year, month]
  );

  function previewRangePdf() {
    setPdfPreview(
      attendancePdfFile({
        kind: "range",
        fromKey: rangeData.fromKey,
        toKey: rangeData.toKey,
        unitFilter: unit,
        sessionCount: rangeData.sessionCount,
        memberCount: rangeData.memberCount,
        overall: rangeData.overall,
        byUnit: rangeData.byUnit,
        memberStats: rangeData.memberStats.map((m) => ({
          fullName: m.fullName,
          unit: m.unit,
          gender: m.gender,
          sessions: m.sessions,
          attended: m.attended,
          absentCount: m.absentCount,
          rate: m.rate,
        })),
      })
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Calendar &amp; attendance
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {orgSettings.locationName} · pick a date, mark members, export PDFs
          </p>
        </div>
        {pending && (
          <span className="text-xs text-slate-400">Updating…</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => pushParams({ unit: null })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
            unit === "all"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          All units
        </button>
        {ALL_UNITS.map((u) => {
          const colors = UNIT_COLORS[u];
          const active = unit === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => pushParams({ unit: u })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? `${colors.pill}`
                  : `${colors.soft} ${colors.text} ${colors.border} hover:brightness-95`
              )}
            >
              {UNIT_LABELS[u]}
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-5">
          <AttendanceCalendar
            year={year}
            month={month}
            selectedDateKey={initialDateKey}
            dayMap={dayMap}
            onSelectDate={(key) => {
              const d = parseISO(key);
              pushParams({
                date: key,
                year: String(d.getFullYear()),
                month: String(d.getMonth() + 1),
              });
            }}
            onChangeMonth={(y, m) => {
              const first = startOfMonth(new Date(y, m - 1, 1));
              pushParams({
                year: String(y),
                month: String(m),
                date: dateKey(first),
              });
            }}
          />
          <AttendanceSessionDetails
            dateKey={initialDateKey}
            year={year}
            month={month}
            session={session}
          />
        </div>

        <AttendanceEntryForm
          dateKey={initialDateKey}
          members={searchMembers}
          onMarkedPresent={addPresentToList}
        />
      </div>

      <AttendanceMarkPanel
        dateKey={dayData.dateKey}
        unitFilter={unit}
        rows={markRows}
        totals={dayData.totals}
        byUnit={dayData.byUnit}
        byGender={dayData.byGender}
        returnTo={returnTo}
        onSelectUnit={(next) =>
          pushParams({ unit: next && next !== "all" ? next : null })
        }
        onRemoved={(id) =>
          setLivePresent((current) =>
            current.filter((r) => r.memberId !== id)
          )
        }
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowRangeReport((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-6"
          aria-expanded={showRangeReport}
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">Range report</h2>
            <p className="text-sm text-slate-500">
              Present / absent totals across sessions · {monthLabel}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 text-slate-400 transition",
              showRangeReport && "rotate-90 text-slate-700"
            )}
          >
            ▸
          </span>
        </button>

        {showRangeReport && (
          <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            From
            <Input
              type="date"
              value={fromKey}
              onChange={(e) => setFromKey(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            To
            <Input
              type="date"
              value={toKey}
              onChange={(e) => setToKey(e.target.value)}
            />
          </label>
          <Button
            type="button"
            onClick={() => pushParams({ from: fromKey, to: toKey })}
          >
            Apply range
          </Button>
        </div>
          <Button type="button" variant="outline" onClick={previewRangePdf}>
            Preview range PDF
          </Button>
        </div>

        <AttendanceSummaryCards
          totals={rangeData.overall}
          title={`Period totals · ${rangeData.sessionCount} session(s) · ${rangeData.memberCount} members`}
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {rangeData.byUnit.map((u) => (
            <div
              key={u.unit}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-slate-800">{u.label}</p>
              <p className="mt-1 text-xs tabular-nums text-slate-600">
                {formatPaRate(u)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold">
          <span className="text-slate-800">Total</span>
          <span className="tabular-nums text-slate-700">
            {formatPaRate(rangeData.overall)}
          </span>
        </div>
          </div>
        )}
      </section>

      <AttendancePdfPreview
        file={pdfPreview}
        onClose={() => setPdfPreview(null)}
      />
    </div>
  );
}
