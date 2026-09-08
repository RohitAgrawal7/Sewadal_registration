import Link from "next/link";
import { format } from "date-fns";
import type { MemberWithDerived } from "@/lib/dates";
import { UnitBadge } from "@/components/ui/UnitBadge";

export function BirthdayListRow({ member }: { member: MemberWithDerived }) {
  return (
    <li>
      <Link
        href={`/members/${member.id}`}
        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{member.fullName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {format(member.derived.nextBirthdayDate, "MMM d")} · turns{" "}
            {member.derived.turningAge}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <UnitBadge unit={member.unit} />
          <span className="text-xs font-semibold text-teal-700">View</span>
        </div>
      </Link>
    </li>
  );
}
