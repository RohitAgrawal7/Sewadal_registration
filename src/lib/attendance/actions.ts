"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { readyPrisma } from "@/lib/prisma";
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
import { parseMemberId } from "@/lib/members/ids";
import {
  WRITE_CHUNK,
  chunkArray,
  publicDbError,
  withDbRetry,
} from "@/lib/db/helpers";

export type AttendanceMarkInput = {
  memberId: number;
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

function attendanceError(e: unknown, fallback: string): string {
  const msg = publicDbError(e, fallback);
  if (/Foreign key|P2003/i.test(String(e instanceof Error ? e.message : e))) {
    return "Member not found. Refresh and try again.";
  }
  return msg;
}

function softRevalidate(...paths: Array<string | [string, "layout"]>) {
  try {
    for (const path of paths) {
      if (Array.isArray(path)) revalidatePath(path[0], path[1]);
      else revalidatePath(path);
    }
  } catch (error) {
    console.warn("revalidatePath skipped", error);
  }
}

function toMemberId(value: string | number): number | null {
  return parseMemberId(value);
}

export async function saveAttendanceForDate(
  dateKey: string,
  marks: AttendanceMarkInput[]
): Promise<{ success: true } | { success: false; error: string }> {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }

  if (!marks.length) {
    return { success: false, error: "Mark at least one member before saving" };
  }

  const day = parseDateKey(dateKey);

  for (const mark of marks) {
    if (!Number.isInteger(mark.memberId) || mark.memberId <= 0) {
      return { success: false, error: "Missing member id" };
    }
    if (!(ATTENDANCE_STATUSES as string[]).includes(mark.status)) {
      return { success: false, error: `Invalid status for member ${mark.memberId}` };
    }
  }

  try {
    const db = await readyPrisma();
    // One SQL upsert batch per chunk — scales to 100+ marks without pool exhaustion.
    const now = new Date();
    for (const chunk of chunkArray(marks, WRITE_CHUNK)) {
      const values = chunk.map(
        (mark) =>
          Prisma.sql`(
            ${mark.memberId},
            ${day},
            ${mark.status},
            ${mark.notes?.trim() || null},
            ${now},
            ${now}
          )`
      );
      await withDbRetry("saveAttendanceChunk", () =>
        db.$executeRaw`
          INSERT INTO sewadal."AttendanceRecord"
            ("memberId", "date", "status", "notes", "markedAt", "updatedAt")
          VALUES ${Prisma.join(values)}
          ON CONFLICT ("memberId", "date")
          DO UPDATE SET
            "status" = EXCLUDED."status",
            "notes" = EXCLUDED."notes",
            "markedAt" = EXCLUDED."markedAt",
            "updatedAt" = EXCLUDED."updatedAt"
        `
      );
    }

    softRevalidate("/attendance", "/");
    return { success: true };
  } catch (e) {
    console.error("saveAttendanceForDate failed", e);
    return {
      success: false,
      error: attendanceError(e, "Failed to save attendance"),
    };
  }
}

export async function markAllForDate(
  dateKey: string,
  memberIds: Array<string | number>,
  status: AttendanceStatus
): Promise<{ success: true } | { success: false; error: string }> {
  const ids = memberIds
    .map((id) => toMemberId(id))
    .filter((id): id is number => id != null);
  return saveAttendanceForDate(
    dateKey,
    ids.map((memberId) => ({ memberId, status }))
  );
}

export async function markMemberPresent(
  dateKey: string,
  memberId: string | number
): Promise<{ success: true } | { success: false; error: string }> {
  const id = toMemberId(memberId);
  if (!id) return { success: false, error: "Member not found" };
  return saveAttendanceForDate(dateKey, [
    { memberId: id, status: AttendanceStatus.Present },
  ]);
}

export async function clearAttendanceForDate(
  dateKey: string,
  memberIds?: Array<string | number>
): Promise<{ success: true } | { success: false; error: string }> {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return { success: false, error: "Invalid date" };
  }
  const day = parseDateKey(dateKey);
  const ids = memberIds
    ?.map((id) => toMemberId(id))
    .filter((id): id is number => id != null);

  try {
    const db = await readyPrisma();
    await db.attendanceRecord.deleteMany({
      where: {
        date: day,
        ...(ids?.length ? { memberId: { in: ids } } : {}),
      },
    });
    softRevalidate("/attendance");
    return { success: true };
  } catch (e) {
    console.error("clearAttendanceForDate failed", e);
    return { success: false, error: attendanceError(e, "Failed to clear attendance") };
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
    const db = await readyPrisma();
    await db.attendanceSession.upsert({
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
    softRevalidate("/attendance");
    return { success: true };
  } catch (e) {
    console.error("saveAttendanceSession failed", e);
    return { success: false, error: attendanceError(e, "Failed to save session") };
  }
}

/** Create a new member quickly and mark attendance for the date. */
export async function quickAddMemberAndMark(
  dateKey: string,
  input: QuickMemberInput
): Promise<
  | { success: true; id: number; created: true }
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

  try {
    const db = await readyPrisma();
    const member = await db.member.create({
      data: {
        fullName: name,
        gender: input.gender,
        dateOfBirth: dob,
        nationalIdType: "Other",
        email: `pending.${Date.now()}@local.registry`,
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
        sewaRole: "Sewadal",
        registryStatus: "Registered",
        unitHistory: {
          create: {
            unit: input.unit,
            startDate: day,
            endDate: null,
          },
        },
      },
    });

    await db.member.update({
      where: { id: member.id },
      data: { email: `member.${member.id}@local.registry` },
    });

    await db.attendanceRecord.create({
      data: {
        memberId: member.id,
        date: day,
        status,
      },
    });

    softRevalidate("/attendance", "/", ["/lists", "layout"]);
    return { success: true, id: member.id, created: true };
  } catch (e) {
    console.error("quickAddMemberAndMark failed", e);
    return { success: false, error: attendanceError(e, "Failed to add member") };
  }
}
