import Link from "next/link";
import { format } from "date-fns";
import type { MemberWithDerived } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { UnitBadge } from "@/components/ui/UnitBadge";
import { cn } from "@/lib/utils";

export function BirthdayCard({
  member,
  variant,
}: {
  member: MemberWithDerived;
  variant: "today" | "week";
}) {
  const { turningAge, nextBirthdayDate } = member.derived;

  return (
    <article
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md",
        variant === "today" &&
          "w-72 border-amber-300 bg-amber-50/80 ring-1 ring-amber-200",
        variant === "week" && "border-l-4 border-l-teal-500 border-slate-200"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          photoUrl={member.photoUrl}
          name={member.fullName}
          size={variant === "today" ? "lg" : "md"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {variant === "today" && (
              <span className="text-base" aria-hidden>
                🎂
              </span>
            )}
            <h3 className="truncate font-bold text-slate-900">
              {member.fullName}
            </h3>
          </div>
          <div className="mt-1.5">
            <UnitBadge unit={member.unit} />
          </div>
        </div>
      </div>
      <div>
        <p
          className={cn(
            "font-bold text-slate-800",
            variant === "today" ? "text-lg" : "text-sm"
          )}
        >
          Turns {turningAge}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {format(nextBirthdayDate, "EEEE, MMM d")}
          {variant === "today" ? " · Today" : ""}
        </p>
      </div>
      <Link
        href={`/members/${member.id}`}
        className="mt-auto inline-flex w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
      >
        View profile
      </Link>
    </article>
  );
}
