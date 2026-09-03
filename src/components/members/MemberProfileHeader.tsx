"use client";

import Link from "next/link";
import { formatBirthdayChip } from "@/lib/dates";
import type { MemberWithDerived } from "@/lib/dates";
import type { Member, UnitAssignmentLog } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SEWA_ROLE_LABELS, normalizeSewaRole } from "@/lib/sewadaar";

type MemberDetail = MemberWithDerived<
  Member & { unitHistory?: UnitAssignmentLog[] }
>;

export function MemberProfileHeader({
  member,
  onEdit,
  backHref,
}: {
  member: MemberDetail;
  onEdit: () => void;
  backHref?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        <Avatar
          photoUrl={member.photoUrl}
          name={member.fullName}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {member.fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <UnitBadge unit={member.unit} />
            <StatusBadge status={member.membershipStatus} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {SEWA_ROLE_LABELS[normalizeSewaRole(member.sewaRole)]}
            </span>
          </div>
          {member.fatherHusbandName && (
            <p className="mt-2 text-sm text-slate-500">
              S/O or H/O {member.fatherHusbandName}
            </p>
          )}
          {(member.profession || member.role) && (
            <p className="mt-0.5 text-sm text-slate-600">
              {member.profession || member.role}
            </p>
          )}
          <p className="mt-3 inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900">
            {formatBirthdayChip(member)}
          </p>
          <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-8">
            <div>
              <dt className="text-xs text-slate-400">Age</dt>
              <dd>{member.derived.age}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Org tenure</dt>
              <dd>{member.derived.tenureInOrgLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Unit tenure</dt>
              <dd>{member.derived.tenureInCurrentUnitLabel}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-400">Email</dt>
              <dd className="break-all">{member.email}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        <Link href={backHref || "/lists"} className="block">
          <Button type="button" variant="outline" className="w-full sm:w-auto">
            ← Back
          </Button>
        </Link>
        <Button type="button" onClick={onEdit} className="w-full sm:w-auto">
          Edit
        </Button>
      </div>
    </div>
  );
}
