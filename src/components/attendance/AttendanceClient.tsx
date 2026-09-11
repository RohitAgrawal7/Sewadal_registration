"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { todayKey } from "@/lib/attendance/date-utils";
import { ALL_UNITS, UNIT_LABELS, unitChipStyle } from "@/lib/unit-colors";
import { orgSettings } from "@/lib/org-settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DbLoadError } from "@/components/ui/DbLoadError";
import { AttendanceCalendar } from "./AttendanceCalendar";
import {
  AttendanceEntryForm,
  AttendanceSessionDetails,
  type SearchMember,
} from "./AttendanceEntryForm";
import { AttendanceMarkPanel } from "./AttendanceMarkPanel";
import { AttendanceSummaryCards } from "./AttendanceSummaryCards";
import {
  fetchAttendanceRangeAction,
  fetchAttendanceSliceAction,
} from "@/lib/attendance/actions";

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
    memberId: number;
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

type SessionPayload = {
  topic: string | null;
  sanchalanSewa: string | null;
  stageSewa: string | null;
} | null;

function syncUrl(pathname: string, patch: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (!v) params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
}

export function AttendanceClient({
  initialDateKey,
  unit: initialUnit,
  year: initialYear,
  month: initialMonth,
  dayMap: initialDayMap,
  dayData: initialDayData,
  rangeData: initialRangeData,
  searchMembers: initialSearchMembers,
  session: initialSession,
  loadError = null,
}: {
  initialDateKey: string;
  unit: string;
  year: number;
  month: number;
  dayMap: Record<string, DaySummary>;
  dayData: DayPayload;
  rangeData: RangePayload;
  searchMembers: SearchMember[];
  loadError?: string | null;
  session: SessionPayload;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [dateKey, setDateKey] = useState(initialDateKey);
  const [unit, setUnit] = useState(initialUnit);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [dayMap, setDayMap] = useState(initialDayMap);
  const [dayData, setDayData] = useState(initialDayData);
  const [rangeData, setRangeData] = useState(initialRangeData);
  const [searchMembers, setSearchMembers] = useState(initialSearchMembers);
  const [session, setSession] = useState(initialSession);
  const [fromKey, setFromKey] = useState(initialRangeData.fromKey);
  const [toKey, setToKey] = useState(initialRangeData.toKey);
  const [livePresent, setLivePresent] = useState<MemberAttendanceRow[]>([]);
  const [showRangeReport, setShowRangeReport] = useState(false);
  const [rangeLoaded, setRangeLoaded] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<AttendancePdfFile | null>(null);

  const returnTo = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    setLivePresent([]);
  }, [dateKey]);

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
    return Array.from(byId.values());
  }, [dayData.rows, livePresent]);

  const loadSlice = useCallback(
    (next: {
      dateKey: string;
      unit: string;
      year: number;
      month: number;
    }) => {
      startTransition(async () => {
        const result = await fetchAttendanceSliceAction(next);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        setDateKey(next.dateKey);
        setUnit(next.unit);
        setYear(result.data.year);
        setMonth(result.data.month);
        setDayMap(result.data.dayMap);
        setDayData({
          dateKey: result.data.dayData.dateKey,
          rows: result.data.dayData.rows,
          totals: result.data.dayData.totals,
          byUnit: result.data.dayData.byUnit,
          byGender: result.data.dayData.byGender,
        });
        setSession(result.data.session);
        setSearchMembers(result.data.searchMembers);
        setRangeLoaded(false);
        syncUrl(pathname, {
          date: next.dateKey,
          unit: next.unit === "all" ? null : next.unit,
          year: String(next.year),
          month: String(next.month),
        });
      });
    },
    [pathname]
  );

  function addPresentToList(row: MemberAttendanceRow) {
    const existing = dayData.rows.find((r) => r.memberId === row.memberId);
    const sessions = existing?.sessions ?? row.sessions ?? 0;
    const alreadyPresent = existing?.status === "Present";
    const attended = Math.min(
      sessions,
      (existing?.attended ?? row.attended ?? 0) + (alreadyPresent ? 0 : 1)
    );
    const absentCount = Math.max(0, sessions - attended);
    const next: MemberAttendanceRow = {
      ...row,
      sessions,
      attended,
      absentCount,
      rate: sessions > 0 ? Math.round((attended / sessions) * 1000) / 10 : 0,
      status: "Present",
    };
    setLivePresent((current) => {
      const without = current.filter((r) => r.memberId !== next.memberId);
      return [...without, next];
    });
    setDayData((current) => ({
      ...current,
      rows: current.rows.map((r) =>
        r.memberId === next.memberId ? { ...r, ...next } : r
      ),
    }));
    requestAnimationFrame(() => {
      document
        .getElementById("todays-present")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function refreshCurrentSlice() {
    loadSlice({ dateKey, unit, year, month });
  }

  async function loadRange(from = fromKey, to = toKey) {
    startTransition(async () => {
      const result = await fetchAttendanceRangeAction({
        fromKey: from,
        toKey: to,
        unit,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRangeData(result.data);
      setFromKey(result.data.fromKey);
      setToKey(result.data.toKey);
      setRangeLoaded(true);
      syncUrl(pathname, { from: result.data.fromKey, to: result.data.toKey });
    });
  }

  const monthLabel = useMemo(
    () => format(new Date(year, month - 1, 1), "MMMM yyyy"),
    [year, month]
  );

  function previewRangePdf() {
    void attendancePdfFile({
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
      .then(setPdfPreview)
      .catch((error: Error) => toast.error(error.message || "PDF failed"));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      {loadError && (
        <DbLoadError
          title="Attendance data could not load"
          message={loadError}
        />
      )}
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

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button
          type="button"
          onClick={() => loadSlice({ dateKey, unit: "all", year, month })}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
            unit === "all"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          All units
        </button>
        {ALL_UNITS.map((u) => {
          const active = unit === u;
          return (
            <button
              key={u}
              type="button"
              onClick={() => loadSlice({ dateKey, unit: u, year, month })}
              style={unitChipStyle(u, active)}
              className="shrink-0 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition"
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
            selectedDateKey={dateKey}
            dayMap={dayMap}
            onSelectDate={(key) => {
              const d = parseISO(key);
              loadSlice({
                dateKey: key,
                unit,
                year: d.getFullYear(),
                month: d.getMonth() + 1,
              });
            }}
            onChangeMonth={(y, m) => {
              const first = startOfMonth(new Date(y, m - 1, 1));
              const key = todayKey(first);
              loadSlice({ dateKey: key, unit, year: y, month: m });
            }}
          />
          <AttendanceSessionDetails
            dateKey={dateKey}
            year={year}
            month={month}
            session={session}
          />
        </div>

        <AttendanceEntryForm
          dateKey={dateKey}
          members={searchMembers}
          onMarkedPresent={addPresentToList}
          skipRefresh
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
          loadSlice({
            dateKey,
            unit: next && next !== "all" ? next : "all",
            year,
            month,
          })
        }
        onRemoved={(id) => {
          setLivePresent((current) =>
            current.filter((r) => r.memberId !== id)
          );
          setDayData((current) => ({
            ...current,
            rows: current.rows.map((r) =>
              r.memberId === id ? { ...r, status: null } : r
            ),
          }));
        }}
        onSaved={refreshCurrentSlice}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => {
            const next = !showRangeReport;
            setShowRangeReport(next);
            if (next && !rangeLoaded) void loadRange();
          }}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
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
                  className="w-full sm:w-auto"
                  onClick={() => void loadRange(fromKey, toKey)}
                >
                  Apply range
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!rangeLoaded}
                onClick={previewRangePdf}
              >
                Preview range PDF
              </Button>
            </div>

            {!rangeLoaded ? (
              <p className="text-sm text-slate-500">Loading range report…</p>
            ) : (
              <>
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
                      <p className="text-sm font-semibold text-slate-800">
                        {u.label}
                      </p>
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
              </>
            )}
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
