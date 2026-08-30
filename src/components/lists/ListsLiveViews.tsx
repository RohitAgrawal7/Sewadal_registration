"use client";

import Link from "next/link";
import { Suspense } from "react";
import type { Unit } from "@/lib/enums";
import { ALL_UNITS, UNIT_LABELS } from "@/lib/unit-colors";
import { listsLocationPath, listsUnitPath, orgSettings } from "@/lib/org-settings";
import { LocationBanner, UnitPickGrid } from "@/components/members/LocationUnitBrowser";
import { MemberTable } from "@/components/members/MemberTable";
import { AddMemberButton } from "@/components/members/AddMemberButton";
import {
  MembersLiveProvider,
  useMembersLive,
} from "@/components/members/MembersLiveContext";
import type { MemberWithDerived } from "@/lib/dates";

function unitCounts(members: MemberWithDerived[]) {
  const counts: Partial<Record<Unit, number>> = {};
  for (const u of ALL_UNITS) counts[u] = 0;
  for (const m of members) {
    const key = m.unit as Unit;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function ListsIndexBody() {
  const { members } = useMembersLive();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Lists
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Open a location, pick a unit, then view member details
          </p>
        </div>
        <AddMemberButton />
      </div>

      <nav className="text-sm text-slate-500">
        <span className="font-semibold text-slate-900">Lists</span>
      </nav>

      <LocationBanner memberCount={members.length} href={listsLocationPath()} />

      <p className="text-sm text-slate-500">
        Click{" "}
        <Link
          href={listsLocationPath()}
          className="font-semibold text-slate-800 underline-offset-2 hover:underline"
        >
          {orgSettings.locationName}
        </Link>{" "}
        to see its 4 units.
      </p>
    </>
  );
}

export function ListsIndexLive({
  initialMembers,
}: {
  initialMembers: MemberWithDerived[];
}) {
  return (
    <MembersLiveProvider initialMembers={initialMembers}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <ListsIndexBody />
      </div>
    </MembersLiveProvider>
  );
}

function ListsLocationBody() {
  const { members } = useMembersLive();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {orgSettings.locationName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Choose a unit to open its member details
          </p>
        </div>
        <AddMemberButton />
      </div>

      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link
          href="/lists"
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Lists
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">
          {orgSettings.locationName}
        </span>
      </nav>

      <LocationBanner memberCount={members.length} />

      <UnitPickGrid
        counts={unitCounts(members)}
        hrefs={{
          Unit1: listsUnitPath("Unit1"),
          Unit2: listsUnitPath("Unit2"),
          Unit3: listsUnitPath("Unit3"),
          Unit4: listsUnitPath("Unit4"),
        }}
      />

      <MemberTable members={members} showAll />
    </>
  );
}

export function ListsLocationLive({
  initialMembers,
}: {
  initialMembers: MemberWithDerived[];
}) {
  return (
    <MembersLiveProvider initialMembers={initialMembers}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <ListsLocationBody />
      </div>
    </MembersLiveProvider>
  );
}

function ListsUnitBody({
  unit,
}: {
  unit: Unit;
}) {
  const { members } = useMembersLive();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {UNIT_LABELS[unit]} members
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {orgSettings.locationName} · open a name for full member details
          </p>
        </div>
        <AddMemberButton defaultUnit={unit} />
      </div>

      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link
          href="/lists"
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          Lists
        </Link>
        <span className="text-slate-300">/</span>
        <Link
          href={listsLocationPath()}
          className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          {orgSettings.locationName}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{UNIT_LABELS[unit]}</span>
      </nav>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading members…
          </div>
        }
      >
        <MemberTable
          members={members}
          lockedUnit={unit}
          locationBackHref={listsLocationPath()}
        />
      </Suspense>
    </>
  );
}

export function ListsUnitLive({
  initialMembers,
  unit,
}: {
  initialMembers: MemberWithDerived[];
  unit: Unit;
}) {
  return (
    <MembersLiveProvider initialMembers={initialMembers}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <ListsUnitBody unit={unit} />
      </div>
    </MembersLiveProvider>
  );
}
