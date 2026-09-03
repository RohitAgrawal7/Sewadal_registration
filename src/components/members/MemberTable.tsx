"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format as formatDateFns } from "date-fns";

function formatDate(
  value: Date | string | null | undefined,
  pattern: string
): string {
  try {
    const d = value instanceof Date ? value : new Date(String(value ?? ""));
    if (Number.isNaN(d.getTime())) return "—";
    return formatDateFns(d, pattern);
  } catch {
    return "—";
  }
}
import { toast } from "sonner";
import { EMPTY_ATTENDANCE, type MemberWithDerived } from "@/lib/dates";
import type { Unit } from "@/lib/enums";
import { ALL_UNITS } from "@/lib/unit-colors";
import { GENDERS, MembershipStatus } from "@/lib/enums";
import { GENDER_LABELS } from "@/lib/validations/member";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { GenderBadge } from "@/components/ui/GenderBadge";
import { genderColors } from "@/lib/gender-colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { paginate, parsePageSize } from "@/lib/pagination";
import { deactivateMember } from "@/lib/members/actions";
import {
  OFFICE_ROLE_ROWS,
  SEWA_ROLE_LABELS,
  isSewadal,
  normalizeSewaRole,
  type SewaRole,
} from "@/lib/sewadaar";

type SortKey =
  | "name"
  | "tenure"
  | "registration"
  | "birthday"
  | "unit"
  | "status";

function parseSort(value: string | null): SortKey {
  if (
    value === "tenure" ||
    value === "registration" ||
    value === "birthday" ||
    value === "unit" ||
    value === "status"
  ) {
    return value;
  }
  return "name";
}

function memberHref(id: string, from: string, edit = false) {
  const params = new URLSearchParams();
  if (edit) params.set("edit", "1");
  params.set("from", from);
  return `/members/${id}?${params.toString()}`;
}

export function MemberTable({
  members,
  lockedUnit,
  locationBackHref,
  showAll,
}: {
  members: MemberWithDerived[];
  lockedUnit?: Unit;
  locationBackHref?: string;
  showAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const q = searchParams.get("q") ?? "";
  const unit = searchParams.get("unit") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const sort = parseSort(searchParams.get("sort"));
  const dir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const page = Number(searchParams.get("page")) || 1;
  const listQuery = searchParams.toString();
  const listPath = listQuery ? `${pathname}?${listQuery}` : pathname;

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const resetsPage = ["q", "gender", "unit", "sort", "dir", "pageSize"].some(
      (key) => key in patch
    );
    if (resetsPage && !("page" in patch)) params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function toggleSort(key: SortKey) {
    if (sort === key) {
      updateParams({ dir: dir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: "asc" });
    }
  }

  const filtered = useMemo(() => {
    let list = members.filter((m) => isSewadal(m.sewaRole));

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(needle) ||
          m.email.toLowerCase().includes(needle) ||
          m.phonePrimary.includes(needle) ||
          (m.preferredName?.toLowerCase().includes(needle) ?? false)
      );
    }
    const unitFilter = lockedUnit || unit;
    if (unitFilter) list = list.filter((m) => m.unit === unitFilter);
    if (gender) list = list.filter((m) => m.gender === gender);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "tenure":
          cmp =
            new Date(a.registrationDate).getTime() -
            new Date(b.registrationDate).getTime();
          break;
        case "registration":
          cmp =
            new Date(a.registrationDate).getTime() -
            new Date(b.registrationDate).getTime();
          break;
        case "birthday":
          cmp =
            (a.derived?.daysUntilNextBirthday ?? 0) -
            (b.derived?.daysUntilNextBirthday ?? 0);
          break;
        case "unit":
          cmp = a.unit.localeCompare(b.unit);
          break;
        case "status":
          cmp = a.membershipStatus.localeCompare(b.membershipStatus);
          break;
        default:
          cmp = a.fullName.localeCompare(b.fullName);
      }
      return dir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [
    members,
    lockedUnit,
    q,
    unit,
    gender,
    sort,
    dir,
  ]);

  const listTotals = useMemo(() => {
    let attended = 0;
    let absent = 0;
    for (const m of filtered) {
      const a = m.attendance ?? EMPTY_ATTENDANCE;
      attended += a.attended;
      absent += a.absent;
    }
    const recorded = attended + absent;
    const rate =
      recorded > 0 ? Math.round((attended / recorded) * 1000) / 10 : 0;
    return { attended, absent, sessions: recorded, rate };
  }, [filtered]);

  const paged = useMemo(
    () => paginate(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const officeMembers = useMemo(() => {
    let list = members.filter((m) => !isSewadal(m.sewaRole));
    const unitFilter = lockedUnit || unit;
    if (unitFilter) list = list.filter((m) => m.unit === unitFilter);
    if (gender) list = list.filter((m) => m.gender === gender);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(needle) ||
          m.phonePrimary.includes(needle)
      );
    }
    return list;
  }, [members, lockedUnit, unit, gender, q]);

  const deactivateTarget = members.find((m) => m.id === deactivateId);

  const unitCounts = useMemo(() => {
    const counts: Partial<Record<Unit, number>> = {};
    for (const u of ALL_UNITS) counts[u] = 0;
    for (const m of members) {
      const key = m.unit as Unit;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [members]);

  const selectedUnit = showAll
    ? ""
    : lockedUnit
      ? lockedUnit
      : ALL_UNITS.includes(unit as Unit)
        ? (unit as Unit)
        : "";
  const showTable = Boolean(showAll || selectedUnit);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sewadal
        </h2>
        <p className="text-xs text-slate-400">
          {showAll || selectedUnit
            ? `${filtered.length} of ${members.length}`
            : `${members.length} total`}
          {pending ? " · updating…" : ""}
        </p>
      </div>

      {!lockedUnit && !showAll && (
        <LocationBanner memberCount={members.length} />
      )}

      {!showTable ? (
        <UnitPickGrid
          counts={unitCounts}
          onSelect={(u) => updateParams({ unit: u })}
        />
      ) : (
        <>
          {!lockedUnit && !showAll && (
            <LocationBreadcrumb
              unit={selectedUnit}
              backHref={locationBackHref}
              onBack={
                locationBackHref
                  ? undefined
                  : () => updateParams({ unit: null })
              }
            />
          )}

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search
          <Input
            value={q}
            placeholder="Name, phone…"
            onChange={(e) => updateParams({ q: e.target.value || null })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Gender
          <Select
            value={gender}
            onChange={(e) => updateParams({ gender: e.target.value || null })}
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <h3 className="text-sm font-semibold text-slate-800">
            Unit incharge &amp; office bearers
          </h3>
          <p className="text-xs text-slate-500">
            Shown separately from the Sewadal list
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {OFFICE_ROLE_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-3 px-3 py-3 sm:grid-cols-2"
            >
              {row.map((role: SewaRole) => {
                const people = officeMembers.filter(
                  (m) => normalizeSewaRole(m.sewaRole) === role
                );
                return (
                  <div key={role} className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {SEWA_ROLE_LABELS[role]}
                    </p>
                    {people.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-400">—</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {people.map((m) => (
                          <li key={m.id} className="text-sm">
                            <Link
                              href={memberHref(m.id, listPath)}
                              className="font-medium text-slate-800 hover:underline"
                            >
                              {m.fullName}
                            </Link>
                            <span className="ml-2 text-xs text-slate-500">
                              {m.phonePrimary}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">
                <button type="button" onClick={() => toggleSort("name")}>
                  Name {sort === "name" ? (dir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Gender</th>
              <th className="px-3 py-2.5 font-medium">
                <button type="button" onClick={() => toggleSort("unit")}>
                  Unit {sort === "unit" ? (dir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Phone</th>
              <th className="px-3 py-2.5 font-medium">Total sessions</th>
              <th className="px-3 py-2.5 font-medium">Attended</th>
              <th className="px-3 py-2.5 font-medium">Absent</th>
              <th className="px-3 py-2.5 font-medium">%</th>
              <th className="px-3 py-2.5 font-medium">
                <button type="button" onClick={() => toggleSort("birthday")}>
                  Birthday{" "}
                  {sort === "birthday" ? (dir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-3 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  No members match these filters.
                </td>
              </tr>
            )}
            {paged.slice.map((m, index) => {
              const a = m.attendance ?? EMPTY_ATTENDANCE;
              return (
              <tr key={m.id} className={genderColors(m.gender).row}>
                <td className="px-3 py-2.5 tabular-nums text-slate-500">
                  {paged.start + index + 1}
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-900">
                  <Link
                    href={memberHref(m.id, listPath)}
                    className="hover:underline"
                  >
                    {m.fullName}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <GenderBadge gender={m.gender} />
                </td>
                <td className="px-3 py-2.5">
                  <UnitBadge unit={m.unit} />
                </td>
                <td className="px-3 py-2.5 text-slate-600">{m.phonePrimary}</td>
                <td className="px-3 py-2.5 tabular-nums text-slate-700">
                  {a.recorded}
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums text-emerald-700">
                  {a.attended}
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums text-red-700">
                  {a.absent}
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-800">
                  {a.rate}%
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {formatDate(m.dateOfBirth, "MMM d")}
                  {m.derived && m.derived.daysUntilNextBirthday <= 30 && (
                    <span className="ml-1 text-amber-700">
                      🎂 in {m.derived.daysUntilNextBirthday}d
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <Link href={memberHref(m.id, listPath)}>
                      <Button type="button" size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                    <Link href={memberHref(m.id, listPath, true)}>
                      <Button type="button" size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                    {m.membershipStatus !== MembershipStatus.Inactive && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="Deactivate"
                        aria-label={`Deactivate ${m.fullName}`}
                        onClick={() => setDeactivateId(m.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M7 7l10 10" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold">
                <td className="px-3 py-2.5" colSpan={5}>
                  Total
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                  {listTotals.sessions}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-emerald-700">
                  {listTotals.attended}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-red-700">
                  {listTotals.absent}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-slate-800">
                  {listTotals.rate}%
                </td>
                <td className="px-3 py-2.5" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
        </div>
        <PaginationBar
          total={paged.total}
          page={paged.current}
          pageSize={pageSize}
          from={paged.from}
          to={paged.to}
          pageCount={paged.pageCount}
          onPageChange={(next) => updateParams({ page: String(next) })}
          onPageSizeChange={(size) => updateParams({ pageSize: String(size) })}
        />
      </div>
        </>
      )}

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title="Deactivate member"
        description={
          <>
            Set <strong>{deactivateTarget?.fullName}</strong> to Inactive? This
            does not delete their record.
          </>
        }
        confirmLabel="Deactivate"
        variant="danger"
        loading={deactivating}
        onConfirm={async () => {
          if (!deactivateId) return;
          setDeactivating(true);
          const result = await deactivateMember(deactivateId);
          setDeactivating(false);
          setDeactivateId(null);
          if (result.success) {
            toast.success("Member deactivated");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        }}
      />
    </section>
  );
}
