"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { MemberWithDerived } from "@/lib/dates";
import { bucketBirthdays } from "@/lib/dates";
import { BirthdayCard } from "./BirthdayCard";
import { BirthdayListRow } from "./BirthdayListRow";
import { Button } from "@/components/ui/Button";

export function BirthdaySpotlight({
  members,
}: {
  members: MemberWithDerived[];
}) {
  const [open, setOpen] = useState(true);
  const buckets = useMemo(() => bucketBirthdays(members), [members]);
  const hasMonth = buckets.thisMonth.length > 0;
  const hasAny =
    buckets.today.length > 0 ||
    buckets.thisWeek.length > 0 ||
    buckets.thisMonth.length > 0;

  const count =
    buckets.today.length + buckets.thisWeek.length + buckets.thisMonth.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-amber-50/70 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg" aria-hidden>
              🎂
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
              Birthday spotlight
            </p>
            {hasAny && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
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
            <div className="rounded-xl border border-dashed border-amber-300/80 bg-white/80 px-4 py-10 text-center">
              <p className="text-base font-medium text-slate-700">
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
                  Register members to see birthday cards here.
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
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-sm">
                {buckets.thisMonth.map((m) => (
                  <BirthdayListRow key={m.id} member={m} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
