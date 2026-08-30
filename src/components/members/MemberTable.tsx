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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GenderBadge } from "@/components/ui/GenderBadge";
import { genderColors } from "@/lib/gender-colors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deactivateMember } from "@/lib/members/actions";
import {
  LocationBanner,
  LocationBreadcrumb,
  UnitPickGrid,
} from "@/components/members/LocationUnitBrowser";

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
  const listQuery = searchParams.toString();
  const listPath = listQuery ? `${pathname}?${listQuery}` : pathname;

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
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
    let list = [...members];

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
          Members
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <th className="px-3 py-2.5 font-medium">
                <button type="button" onClick={() => toggleSort("status")}>
                  Status {sort === "status" ? (dir === "asc" ? "↑" : "↓") : ""}
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
                  colSpan={12}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  No members match these filters.
                </td>
              </tr>
            )}
            {filtered.map((m, index) => {
              const a = m.attendance ?? EMPTY_ATTENDANCE;
              return (
              <tr key={m.id} className={genderColors(m.gender).row}>
                <td className="px-3 py-2.5 tabular-nums text-slate-500">
                  {index + 1}
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
                <td className="px-3 py-2.5">
                  <StatusBadge status={m.membershipStatus} />
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
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setDeactivateId(m.id)}
                      >
                        Deactivate
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
                <td className="px-3 py-2.5" colSpan={6}>
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
