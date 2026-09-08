"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { MemberWithDerived } from "@/lib/dates";
import { bucketBirthdays } from "@/lib/dates";
import { BirthdayCard } from "./BirthdayCard";
import { Button } from "@/components/ui/Button";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { paginate, type PageSize } from "@/lib/pagination";

export function BirthdaySpotlight({
  members,
}: {
  members: MemberWithDerived[];
}) {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const buckets = useMemo(() => bucketBirthdays(members), [members]);
  const monthPage = useMemo(
    () => paginate(buckets.thisMonth, page, pageSize),
    [buckets.thisMonth, page, pageSize]
  );
  const hasMonth = buckets.thisMonth.length > 0;
  const hasAny =
    buckets.today.length > 0 ||
    buckets.thisWeek.length > 0 ||
    buckets.thisMonth.length > 0;

  const count =
    buckets.today.length + buckets.thisWeek.length + buckets.thisMonth.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_24px_rgba(180,83,9,0.08)]">
      <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-stone-600" />
      <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50/70 to-stone-100/60 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-900">
              Birthday spotlight
            </p>
            {hasAny && (
              <span className="rounded-full bg-gradient-to-r from-amber-200 to-orange-200 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                {count} this month
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            Upcoming birthdays
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Today first, then this week, then the rest of the month
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-300/80 bg-white hover:bg-amber-50"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Collapse" : "Expand"}
        </Button>
      </div>

      {open && (
        <div className="space-y-5 p-4 sm:p-6">
          {!hasAny && (
            <div className="rounded-xl border border-dashed border-amber-300/80 bg-amber-50/40 px-4 py-10 text-center">
              <p className="text-base font-semibold text-slate-800">
                No birthdays this month
              </p>
              {buckets.nextUpcoming ? (
                <p className="mt-2 text-sm text-slate-600">
                  Next up:{" "}
                  <span className="font-semibold text-slate-900">
                    {buckets.nextUpcoming.fullName}
                  </span>{" "}
                  on{" "}
                  <span className="font-semibold text-slate-900">
                    {format(
                      buckets.nextUpcoming.derived.nextBirthdayDate,
                      "MMM d, yyyy"
                    )}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Register members to see birthday entries here.
                </p>
              )}
            </div>
          )}

          {buckets.today.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
                Today
              </h3>
              <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {buckets.today.map((m) => (
                  <BirthdayCard key={m.id} member={m} variant="today" />
                ))}
              </div>
            </div>
          )}

          {buckets.thisWeek.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                This week
              </h3>
              <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                {buckets.thisWeek.map((m) => (
                  <BirthdayCard key={m.id} member={m} variant="week" />
                ))}
              </div>
            </div>
          )}

          {hasMonth && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Later this month
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Member</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Turning</th>
                        <th className="px-4 py-3 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthPage.slice.map((m) => (
                        <tr
                          key={m.id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-800">
                            {format(m.derived.nextBirthdayDate, "EEE, MMM d")}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {m.fullName}
                          </td>
                          <td className="px-4 py-3">
                            <UnitBadge unit={m.unit} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                            Age {m.derived.turningAge}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/members/${m.id}`}
                              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  total={monthPage.total}
                  page={monthPage.current}
                  pageSize={pageSize}
                  from={monthPage.from}
                  to={monthPage.to}
                  pageCount={monthPage.pageCount}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
