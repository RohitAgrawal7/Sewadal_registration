import Link from "next/link";
import type { MemberWithDerived } from "@/lib/dates";
import { formatCompactBirthdayRow } from "@/lib/dates";

export function BirthdayListRow({ member }: { member: MemberWithDerived }) {
  return (
    <li>
      <Link
        href={`/members/${member.id}`}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span>{formatCompactBirthdayRow(member)}</span>
        <span className="text-xs text-slate-400">View</span>
      </Link>
    </li>
  );
}
