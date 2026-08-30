"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  AttendanceStatus,
  ATTENDANCE_STATUSES,
  Gender,
  MembershipStatus,
  Unit,
  UNITS,
} from "@/lib/enums";
import { parseDateKey } from "@/lib/attendance/date-utils";
import { orgSettings } from "@/lib/org-settings";

export type AttendanceMarkInput = {
  memberId: string;
  status: AttendanceStatus;
  notes?: string;
};

export type QuickMemberInput = {
  fullName: string;
  gender: string;
  phone?: string;
  age?: string;
  address?: string;
  unit: string;
  status?: AttendanceStatus;
};

export async function saveAttendanceForDate(
  dateKey: string,
  marks: AttendanceMarkInput[]
): Promise<{ success: true } | { success: false; error: string }> {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }

  const day = parseDateKey(dateKey);

  for (const mark of marks) {
    if (!(ATTENDANCE_STATUSES as string[]).includes(mark.status)) {
      return { success: false, error: `Invalid status for member ${mark.memberId}` };
    }
  }

  try {
    await prisma.$transaction(
      marks.map((mark) =>
        prisma.attendanceRecord.upsert({
          where: {
            memberId_date: {
              memberId: mark.memberId,
              date: day,
            },
          },
          create: {
            memberId: mark.memberId,
            date: day,
            status: mark.status,
            notes: mark.notes?.trim() || null,
          },
          update: {
            status: mark.status,
            notes: mark.notes?.trim() || null,
            markedAt: new Date(),
          },
        })
      )
    );

    revalidatePath("/attendance");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save attendance" };
  }
}

export async function markAllForDate(
  dateKey: string,
  memberIds: string[],
  status: AttendanceStatus
): Promise<{ success: true } | { success: false; error: string }> {
  return saveAttendanceForDate(
    dateKey,
    memberIds.map((memberId) => ({ memberId, status }))
  );
}

export async function markMemberPresent(
  dateKey: string,
  memberId: string
): Promise<{ success: true } | { success: false; error: string }> {
  return saveAttendanceForDate(dateKey, [
    { memberId, status: AttendanceStatus.Present },
  ]);
}

export async function clearAttendanceForDate(
  dateKey: string,
  memberIds?: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }
  const day = parseDateKey(dateKey);

  try {
    await prisma.attendanceRecord.deleteMany({
      where: {
        date: day,
        ...(memberIds?.length ? { memberId: { in: memberIds } } : {}),
      },
    });
    revalidatePath("/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to clear attendance" };
  }
}

export async function saveAttendanceSession(
  dateKey: string,
  data: { topic?: string; sanchalanSewa?: string; stageSewa?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }
  const day = parseDateKey(dateKey);

  try {
    await prisma.attendanceSession.upsert({
      where: { date: day },
      create: {
        date: day,
        topic: data.topic?.trim() || null,
        sanchalanSewa: data.sanchalanSewa?.trim() || null,
        stageSewa: data.stageSewa?.trim() || null,
      },
      update: {
        topic: data.topic?.trim() || null,
        sanchalanSewa: data.sanchalanSewa?.trim() || null,
        stageSewa: data.stageSewa?.trim() || null,
      },
    });
    revalidatePath("/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save session" };
  }
}

/** Create a new member quickly and mark attendance for the date. */
export async function quickAddMemberAndMark(
  dateKey: string,
  input: QuickMemberInput
): Promise<
  | { success: true; id: string; created: true }
  | { success: false; error: string }
> {
  const name = input.fullName.trim();
  if (!name) return { success: false, error: "Name is required" };
  if (
    input.gender !== Gender.Male &&
    input.gender !== Gender.Female &&
    input.gender !== Gender.Child
  ) {
    return { success: false, error: "Select Male, Female, or Child" };
  }
  if (!(UNITS as string[]).includes(input.unit)) {
    return { success: false, error: "Select a unit / class" };
  }
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }

  const status = input.status ?? AttendanceStatus.Present;
  const day = parseDateKey(dateKey);
  const now = new Date();
  const ageNum = input.age ? Number(input.age) : NaN;
  const dob = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120
    ? new Date(now.getFullYear() - Math.floor(ageNum), 0, 1)
    : new Date(2000, 0, 1);

  const phone = input.phone?.trim() || "0000000000";
  const addressLine = input.address?.trim() || "—";
  const id = randomUUID();
  const email = `member.${id.slice(0, 8)}@local.registry`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.member.create({
        data: {
          id,
          fullName: name,
          gender: input.gender,
          dateOfBirth: dob,
          nationalIdType: "Other",
          email,
          phonePrimary: phone,
          address: addressLine,
          city: addressLine.includes(",")
            ? addressLine.split(",")[0]!.trim()
            : "—",
          stateRegion: addressLine.includes(",")
            ? addressLine.split(",").slice(1).join(",").trim() || "—"
            : "—",
          country: orgSettings.defaultCountry,
          unit: input.unit as Unit,
          unitAssignedDate: day,
          registrationDate: day,
          membershipStatus: MembershipStatus.Active,
          statusEffectiveDate: day,
          unitHistory: {
            create: {
              unit: input.unit,
              startDate: day,
              endDate: null,
            },
          },
        },
      });

      await tx.attendanceRecord.create({
        data: {
          memberId: id,
          date: day,
          status,
        },
      });
    });

    revalidatePath("/attendance");
    revalidatePath("/lists", "layout");
    revalidatePath("/");
    return { success: true, id, created: true };
  } catch {
    return { success: false, error: "Failed to add member" };
  }
}
