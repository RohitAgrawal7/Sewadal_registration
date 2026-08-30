import { Suspense } from "react";
import { getDashboardStats } from "@/lib/members/queries";
import { BirthdaySpotlight } from "@/components/birthday/BirthdaySpotlight";
import { QuickStatsRow } from "@/components/stats/QuickStatsRow";
import { MemberTable } from "@/components/members/MemberTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:space-y-10 lg:py-10">
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-teal-400 via-sky-400 to-amber-400" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Overview
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-300 sm:text-base">
              Birthdays, unit health, attendance, and the full member roster
            </p>
          </div>
          <a
            href="/attendance"
            className="inline-flex items-center rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-teal-300"
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
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
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
