import { Suspense } from "react";
import { getDashboardStats } from "@/lib/members/queries";
import { BirthdaySpotlight } from "@/components/birthday/BirthdaySpotlight";
import { QuickStatsRow } from "@/components/stats/QuickStatsRow";
import { MemberTable } from "@/components/members/MemberTable";
import { DbLoadError } from "@/components/ui/DbLoadError";
import { publicDbError } from "@/lib/db/helpers";
import type { Unit } from "@/lib/enums";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EMPTY_BY_UNIT: Record<Unit, number> = {
  Unit1: 0,
  Unit2: 0,
  Unit3: 0,
  Unit4: 0,
};

export default async function DashboardPage() {
  let loadError: string | null = null;
  let stats: Awaited<ReturnType<typeof getDashboardStats>> = {
    total: 0,
    active: 0,
    byUnit: { ...EMPTY_BY_UNIT },
    newThisMonth: 0,
    members: [],
  };

  try {
    stats = await getDashboardStats();
  } catch (error) {
    console.error("Dashboard data failed", error);
    loadError = publicDbError(error, "Could not load dashboard");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:space-y-10 lg:py-10">
      {loadError ? (
        <DbLoadError title="Dashboard data could not load" message={loadError} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-amber-50 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_28px_rgba(37,99,235,0.08)]">
        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-amber-600" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800/80">
              Overview
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600 sm:text-base">
              Birthdays, unit health, attendance, and the full member roster
            </p>
          </div>
          <a
            href="/attendance"
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/25 transition hover:from-sky-500 hover:to-blue-600"
          >
            Open calendar &amp; attendance →
          </a>
        </div>
      </section>

      <BirthdaySpotlight members={stats.members} />
      <QuickStatsRow
        total={stats.total}
        active={stats.active}
        byUnit={stats.byUnit}
        newThisMonth={stats.newThisMonth}
        members={stats.members}
      />
      <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-sky-50/40 p-4 shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_8px_24px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="mb-4 border-b border-sky-100/80 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-800/70">
            Member roster
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Search, filter, and open a member
          </p>
        </div>
        <Suspense
          fallback={
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Loading member table…
            </div>
          }
        >
          <MemberTable members={stats.members} showAll />
        </Suspense>
      </section>
    </div>
  );
}
