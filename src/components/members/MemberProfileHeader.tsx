"use client";

import Link from "next/link";
import { formatBirthdayChip } from "@/lib/dates";
import type { MemberWithDerived } from "@/lib/dates";
import type { Member, UnitAssignmentLog } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";

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
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="flex gap-4">
        <Avatar
          photoUrl={member.photoUrl}
          name={member.fullName}
          size="xl"
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {member.fullName}
            </h1>
            <UnitBadge unit={member.unit} />
            <StatusBadge status={member.membershipStatus} />
          </div>
          {member.preferredName && (
            <p className="mt-0.5 text-sm text-slate-500">
              Prefers “{member.preferredName}”
            </p>
          )}
          {member.role && (
            <p className="mt-0.5 text-sm text-slate-600">{member.role}</p>
          )}
          <p className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900">
            {formatBirthdayChip(member)}
          </p>
          <dl className="mt-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-8">
            <div>
              <dt className="inline text-slate-400">Age: </dt>
              <dd className="inline">{member.derived.age}</dd>
            </div>
            <div>
              <dt className="inline text-slate-400">Org tenure: </dt>
              <dd className="inline">{member.derived.tenureInOrgLabel}</dd>
            </div>
            <div>
              <dt className="inline text-slate-400">Unit tenure: </dt>
              <dd className="inline">
                {member.derived.tenureInCurrentUnitLabel}
              </dd>
            </div>
            <div>
              <dt className="inline text-slate-400">Email: </dt>
              <dd className="inline">{member.email}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={backHref || "/lists"}>
          <Button type="button" variant="outline">
            ← Back
          </Button>
        </Link>
        <Button type="button" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}
