"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  AttendanceStatus,
  GENDERS,
  type Unit,
} from "@/lib/enums";
import {
  ATTENDANCE_STATUS_LABELS,
  formatPaRate,
  type GenderAttendanceBreakdown,
  type MemberAttendanceRow,
  type UnitAttendanceBreakdown,
  type AttendanceTotals,
} from "@/lib/attendance/stats";
import {
  clearAttendanceForDate,
  markAllForDate,
  saveAttendanceForDate,
} from "@/lib/attendance/actions";
import {
  attendancePdfFile,
  type AttendancePdfFile,
} from "@/lib/attendance/pdf";
import { AttendancePdfPreview } from "./AttendancePdfPreview";
import { UNIT_LABELS } from "@/lib/unit-colors";
import { GENDER_LABELS } from "@/lib/validations/member";
import { memberHref } from "@/lib/return-path";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { GenderBadge } from "@/components/ui/GenderBadge";
import { genderColors } from "@/lib/gender-colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LocationBreadcrumb } from "@/components/members/LocationUnitBrowser";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { paginate, type PageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Draft = Record<string, AttendanceStatus | "">;

export function AttendanceMarkPanel({
  dateKey,
  unitFilter,
  rows,
  totals,
  byUnit,
  byGender,
  returnTo,
  onSelectUnit,
  onRemoved,
}: {
  dateKey: string;
  unitFilter: string;
  rows: MemberAttendanceRow[];
  totals: AttendanceTotals;
  byUnit: UnitAttendanceBreakdown[];
  byGender: GenderAttendanceBreakdown[];
  returnTo?: string;
  onSelectUnit: (unit: string | null) => void;
  onRemoved?: (memberId: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({});
  const [listFilter, setListFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [showByUnit, setShowByUnit] = useState(false);
  const [showByGender, setShowByGender] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [pdfPreview, setPdfPreview] = useState<AttendancePdfFile | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const next: Draft = {};
    for (const r of rows) {
      next[r.memberId] = r.status ?? "";
    }
    setDraft(next);
    setRemovedIds([]);
  }, [rows, dateKey]);

  const dirtyCount = useMemo(() => {
    return rows.filter((r) => {
      const current = draft[r.memberId];
      const saved = r.status ?? "";
      return current !== undefined && current !== saved;
    }).length;
  }, [rows, draft]);

  const filteredRows = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (genderFilter && r.gender !== genderFilter) return false;
      if (!words.length) return true;
      const hay = r.fullName.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, listFilter, genderFilter]);

  const presentRows = filteredRows.filter(
    (r) =>
      !removedIds.includes(r.memberId) &&
      (draft[r.memberId] || r.status) === AttendanceStatus.Present
  );
  const otherRows = filteredRows.filter(
    (r) => (draft[r.memberId] || r.status) !== AttendanceStatus.Present
  );

  useEffect(() => {
    setPage(1);
  }, [listFilter, genderFilter, dateKey, unitFilter]);

  const pagedPresent = paginate(presentRows, page, pageSize);

  function save() {
    const marks = Object.entries(draft)
      .filter(([, status]) => status)
      .map(([memberId, status]) => ({
        memberId,
        status: status as AttendanceStatus,
      }));

    if (marks.length === 0) {
      toast.error("Mark at least one member before saving");
      return;
    }

    startTransition(async () => {
      const result = await saveAttendanceForDate(dateKey, marks);
      if (result.success) {
        toast.success("Attendance saved");
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function bulk(status: AttendanceStatus) {
    startTransition(async () => {
      const result = await markAllForDate(
        dateKey,
        rows.map((r) => r.memberId),
        status
      );
      if (result.success) {
        toast.success(
          `Marked all ${ATTENDANCE_STATUS_LABELS[status].toLowerCase()}`
        );
        setDraft(
          Object.fromEntries(rows.map((r) => [r.memberId, status])) as Draft
        );
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function previewPdf() {
    void attendancePdfFile({
      kind: "day",
      dateKey,
      unitFilter,
      totals,
      byUnit,
      byGender,
      rows: presentRows.map((r) => ({
        fullName: r.fullName,
        unit: r.unit,
        gender: r.gender,
        sessions: r.sessions ?? 0,
        attended: r.attended ?? 0,
        absentCount: r.absentCount ?? 0,
        rate: r.rate ?? 0,
        status: AttendanceStatus.Present,
      })),
    }).then(setPdfPreview);
  }

  function removePresent(memberId: string) {
    startTransition(async () => {
      const result = await clearAttendanceForDate(dateKey, [memberId]);
      if (result.success) {
        toast.success("Removed from today's list");
        onRemoved?.(memberId);
        setRemovedIds((ids) =>
          ids.includes(memberId) ? ids : [...ids, memberId]
        );
        setRemoveId(null);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function MemberRow({
    r,
    index,
  }: {
    r: MemberAttendanceRow;
    index: number;
  }) {
    return (
      <tr className={genderColors(r.gender).row}>
        <td className="px-3 py-2.5 tabular-nums text-slate-500">{index}</td>
        <td className="px-3 py-2.5 font-medium text-slate-900">
          <Link
            href={memberHref(r.memberId, returnTo)}
            className="hover:underline"
          >
            {r.fullName}
          </Link>
        </td>
        <td className="px-3 py-2.5">
          <UnitBadge unit={r.unit} />
        </td>
        <td className="px-3 py-2.5">
          <GenderBadge gender={r.gender} />
        </td>
        <td className="px-3 py-2.5 tabular-nums text-slate-700">
          {r.sessions ?? 0}
        </td>
        <td className="px-3 py-2.5 font-semibold tabular-nums text-emerald-700">
          {r.attended ?? 0}
        </td>
        <td className="px-3 py-2.5 font-semibold tabular-nums text-red-700">
          {r.absentCount ?? 0}
        </td>
        <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-800">
          {r.rate ?? 0}%
        </td>
        <td className="px-3 py-2.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setRemoveId(r.memberId)}
          >
            Delete
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Today&apos;s attendance
          </h2>
          <p className="text-sm text-slate-500">
            {format(parseISO(dateKey), "EEEE, MMMM d, yyyy")}
            {unitFilter !== "all"
              ? ` · ${UNIT_LABELS[unitFilter as Unit] ?? unitFilter}`
              : " · All units"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || rows.length === 0}
            onClick={() => bulk(AttendanceStatus.Present)}
          >
            All present
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || rows.length === 0}
            onClick={() => bulk(AttendanceStatus.Absent)}
          >
            All absent
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || rows.length === 0}
            onClick={previewPdf}
          >
            Preview PDF
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || rows.length === 0}
            onClick={save}
          >
            {pending ? "Saving…" : dirtyCount ? `Save (${dirtyCount})` : "Save"}
          </Button>
        </div>
      </div>

      {unitFilter !== "all" && (
        <LocationBreadcrumb
          unit={unitFilter}
          onBack={() => onSelectUnit(null)}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowByUnit((open) => !open)}
            className="flex w-full items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
            aria-expanded={showByUnit}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              By unit
            </span>
            <span
              className={cn(
                "text-slate-400 transition",
                showByUnit && "rotate-90 text-slate-700"
              )}
            >
              ▸
            </span>
          </button>
          {showByUnit && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {byUnit.map((u) => (
                <button
                  key={u.unit}
                  type="button"
                  onClick={() => onSelectUnit(u.unit)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{u.label}</span>
                  <span className="text-xs tabular-nums text-slate-600">
                    {formatPaRate(u)}
                  </span>
                </button>
              ))}
              <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2.5 text-sm font-semibold">
                <span className="text-slate-800">Total</span>
                <span className="text-xs tabular-nums text-slate-700">
                  {formatPaRate(totals)}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setShowByGender((open) => !open)}
            className="flex w-full items-center justify-between gap-2 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
            aria-expanded={showByGender}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              By gender
            </span>
            <span
              className={cn(
                "text-slate-400 transition",
                showByGender && "rotate-90 text-slate-700"
              )}
            >
              ▸
            </span>
          </button>
          {showByGender && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {byGender.length === 0 && (
                <p className="px-3 py-4 text-sm text-slate-500">
                  No members for this filter
                </p>
              )}
              {byGender.map((g) => (
                <button
                  key={g.gender}
                  type="button"
                  onClick={() =>
                    setGenderFilter(g.gender === "__other__" ? "" : g.gender)
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm",
                    genderColors(g.gender).row
                  )}
                >
                  <span className="font-medium text-slate-800">{g.label}</span>
                  <span className="text-xs tabular-nums text-slate-600">
                    {formatPaRate(g)}
                  </span>
                </button>
              ))}
              {byGender.length > 0 && (
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2.5 text-sm font-semibold">
                  <span className="text-slate-800">Total</span>
                  <span className="text-xs tabular-nums text-slate-700">
                    {formatPaRate(totals)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search list
          <Input
            value={listFilter}
            onChange={(e) => setListFilter(e.target.value)}
            placeholder="Filter by any part of name…"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Gender
          <Select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All (Male / Female / Child)</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <p className="text-xs text-slate-500">
        {presentRows.length} present · {otherRows.length} other ·{" "}
        {filteredRows.length} shown
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          No active members yet. Use the form above to add someone and
          mark them present.
        </div>
      ) : (
        <div className="space-y-4">
          {presentRows.length === 0 && (
            <div
              id="todays-present"
              className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
            >
              No one marked present yet. Use the form above to find a member
              and mark them.
            </div>
          )}
          {presentRows.length > 0 && (
            <div
              id="todays-present"
              className="overflow-hidden rounded-xl border border-emerald-200"
            >
              <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <span>Present ({presentRows.length})</span>
                <span className="normal-case tracking-normal text-emerald-900">
                  {formatPaRate(totals)}
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-12 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Total sessions</th>
                    <th className="px-3 py-2 font-medium">Attended</th>
                    <th className="px-3 py-2 font-medium">Absent</th>
                    <th className="px-3 py-2 font-medium">%</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedPresent.slice.map((r, i) => (
                    <MemberRow
                      key={r.memberId}
                      r={r}
                      index={pagedPresent.start + i + 1}
                    />
                  ))}
                </tbody>
              </table>
              </div>
              <PaginationBar
                total={pagedPresent.total}
                page={pagedPresent.current}
                pageSize={pageSize}
                from={pagedPresent.from}
                to={pagedPresent.to}
                pageCount={pagedPresent.pageCount}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      <AttendancePdfPreview
        file={pdfPreview}
        onClose={() => setPdfPreview(null)}
      />

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Remove from today's list"
        description="This person will be taken off today's present list. Their other records stay."
        confirmLabel="Delete"
        variant="danger"
        loading={pending}
        onConfirm={() => {
          if (removeId) void removePresent(removeId);
        }}
      />
    </div>
  );
}
