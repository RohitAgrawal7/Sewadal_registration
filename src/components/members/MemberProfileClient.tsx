"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import type { Member, UnitAssignmentLog } from "@prisma/client";
import type { MemberWithDerived } from "@/lib/dates";
import { formatDateInput } from "@/lib/utils";
import { MemberProfileHeader } from "@/components/members/MemberProfileHeader";
import { MemberForm } from "@/components/members/MemberForm";
import { UnitHistoryTimeline } from "@/components/members/UnitHistoryTimeline";
import { Button } from "@/components/ui/Button";
import type { MemberFormValues } from "@/lib/validations/member";
import type { Gender, MembershipStatus, NationalIdType, Unit } from "@/lib/enums";

type Detail = MemberWithDerived<Member & { unitHistory: UnitAssignmentLog[] }>;

function toFormValues(member: Detail): MemberFormValues {
  return {
    fullName: member.fullName,
    preferredName: member.preferredName ?? "",
    gender: (member.gender as Gender | null) ?? null,
    dateOfBirth: formatDateInput(member.dateOfBirth),
    nationalIdType: member.nationalIdType as NationalIdType,
    nationalIdNumber: member.nationalIdNumber ?? "",
    photoUrl: member.photoUrl ?? "",
    email: member.email,
    phonePrimary: member.phonePrimary,
    phoneSecondary: member.phoneSecondary ?? "",
    address: member.address,
    city: member.city,
    stateRegion: member.stateRegion,
    postalCode: member.postalCode ?? "",
    country: member.country,
    emergencyContactName: member.emergencyContactName ?? "",
    emergencyContactPhone: member.emergencyContactPhone ?? "",
    unit: member.unit as Unit,
    unitAssignedDate: formatDateInput(member.unitAssignedDate),
    role: member.role ?? "",
    registrationDate: formatDateInput(member.registrationDate),
    membershipStatus: member.membershipStatus as MembershipStatus,
    statusEffectiveDate: formatDateInput(member.statusEffectiveDate),
    lastRenewalDate: member.lastRenewalDate
      ? formatDateInput(member.lastRenewalDate)
      : "",
    notes: member.notes ?? "",
  };
}

export function MemberProfileClient({ member }: { member: Detail }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("from"));
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");

  function leaveEdit() {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Edit {member.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Same sections as registration — unit changes are logged.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={leaveEdit}>
            Cancel edit
          </Button>
        </div>
        <MemberForm
          mode="edit"
          memberId={member.id}
          memberName={member.fullName}
          defaultValues={toFormValues(member)}
          returnTo={returnTo}
          onCancel={leaveEdit}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <MemberProfileHeader
        member={member}
        backHref={returnTo}
        onEdit={() => setEditing(true)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Phone</dt>
              <dd className="text-right text-slate-800">{member.phonePrimary}</dd>
            </div>
            {member.phoneSecondary && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Secondary</dt>
                <dd className="text-right text-slate-800">
                  {member.phoneSecondary}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Address</dt>
              <dd className="text-right text-slate-800">
                {member.address}, {member.city}, {member.stateRegion}
                {member.postalCode ? ` ${member.postalCode}` : ""},{" "}
                {member.country}
              </dd>
            </div>
            {(member.emergencyContactName || member.emergencyContactPhone) && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Emergency</dt>
                <dd className="text-right text-slate-800">
                  {[member.emergencyContactName, member.emergencyContactPhone]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Unit history
          </h2>
          <UnitHistoryTimeline logs={member.unitHistory} />
        </section>
      </div>

      {member.notes && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {member.notes}
          </p>
        </section>
      )}
    </div>
  );
}
