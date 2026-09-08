import type { Member, UnitAssignmentLog } from "@/generated/prisma";
import type { MemberWithDerived } from "@/lib/dates";

export type MemberWithLogs = Member & {
  unitHistory: UnitAssignmentLog[];
};

export type MemberDetail = MemberWithDerived<MemberWithLogs>;

export type { MemberWithDerived };
