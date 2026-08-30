"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAllMembers } from "@/lib/members/queries";
import type { MemberWithDerived } from "@/lib/dates";
import {
  memberFormSchema,
  type MemberFormValues,
} from "@/lib/validations/member";
import { MembershipStatus } from "@/lib/enums";
import { parseDateInput } from "@/lib/utils";

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toMemberData(values: MemberFormValues) {
  return {
    fullName: values.fullName.trim(),
    preferredName: emptyToNull(values.preferredName),
    gender: values.gender ?? null,
    dateOfBirth: parseDateInput(values.dateOfBirth),
    nationalIdType: values.nationalIdType,
    nationalIdNumber: emptyToNull(values.nationalIdNumber),
    photoUrl: emptyToNull(values.photoUrl),
    email: values.email.trim().toLowerCase(),
    phonePrimary: values.phonePrimary.trim(),
    phoneSecondary: emptyToNull(values.phoneSecondary),
    address: values.address.trim(),
    city: values.city.trim(),
    stateRegion: values.stateRegion.trim(),
    postalCode: emptyToNull(values.postalCode),
    country: values.country.trim(),
    emergencyContactName: emptyToNull(values.emergencyContactName),
    emergencyContactPhone: emptyToNull(values.emergencyContactPhone),
    unit: values.unit,
    unitAssignedDate: parseDateInput(values.unitAssignedDate),
    role: emptyToNull(values.role),
    registrationDate: parseDateInput(values.registrationDate),
    membershipStatus: values.membershipStatus,
    statusEffectiveDate: parseDateInput(values.statusEffectiveDate),
    lastRenewalDate: values.lastRenewalDate
      ? parseDateInput(values.lastRenewalDate)
      : null,
    notes: emptyToNull(values.notes),
  };
}

export type CreatedMemberPayload = {
  id: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  dateOfBirth: Date;
  nationalIdType: string;
  nationalIdNumber: string | null;
  photoUrl: string | null;
  email: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  address: string;
  city: string;
  stateRegion: string;
  postalCode: string | null;
  country: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  unit: string;
  unitAssignedDate: Date;
  role: string | null;
  registrationDate: Date;
  membershipStatus: string;
  statusEffectiveDate: Date;
  lastRenewalDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActionResult =
  | { success: true; id: string; member?: CreatedMemberPayload }
  | { success: false; error: string };

function revalidateMemberCaches(memberId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/lists", "layout");
  revalidatePath("/attendance", "layout");
  if (memberId) revalidatePath(`/members/${memberId}`);
}

export async function fetchMembersSnapshot(): Promise<MemberWithDerived[]> {
  return getAllMembers();
}

export async function createMember(
  raw: MemberFormValues
): Promise<ActionResult> {
  const parsed = memberFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid form" };
  }

  const data = toMemberData(parsed.data);

  try {
    const member = await prisma.member.create({
      data: {
        ...data,
        unitHistory: {
          create: {
            unit: data.unit,
            startDate: data.unitAssignedDate,
            endDate: null,
          },
        },
      },
    });

    revalidateMemberCaches(member.id);
    return { success: true, id: member.id, member };
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "code" in e && e.code === "P2002"
        ? "A member with this email already exists"
        : "Failed to create member";
    return { success: false, error: message };
  }
}

export async function updateMember(
  id: string,
  raw: MemberFormValues,
  options?: { confirmUnitChange?: boolean }
): Promise<ActionResult> {
  const parsed = memberFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid form" };
  }

  const existing = await prisma.member.findUnique({
    where: { id },
    include: { unitHistory: { where: { endDate: null }, take: 1 } },
  });
  if (!existing) return { success: false, error: "Member not found" };

  const data = toMemberData(parsed.data);
  const unitChanged = existing.unit !== data.unit;

  if (unitChanged && !options?.confirmUnitChange) {
    return {
      success: false,
      error: "UNIT_CHANGE_REQUIRES_CONFIRMATION",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (unitChanged) {
        const currentLog = existing.unitHistory[0];
        const endDate = data.unitAssignedDate;
        if (currentLog) {
          await tx.unitAssignmentLog.update({
            where: { id: currentLog.id },
            data: { endDate },
          });
        }
        await tx.unitAssignmentLog.create({
          data: {
            memberId: id,
            unit: data.unit,
            startDate: data.unitAssignedDate,
            endDate: null,
          },
        });
      }

      await tx.member.update({
        where: { id },
        data: {
          ...data,
          unitAssignedDate: unitChanged
            ? data.unitAssignedDate
            : existing.unitAssignedDate,
        },
      });
    });

    revalidateMemberCaches(id);
    return { success: true, id };
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "code" in e && e.code === "P2002"
        ? "A member with this email already exists"
        : "Failed to update member";
    return { success: false, error: message };
  }
}

export async function deactivateMember(id: string): Promise<ActionResult> {
  const existing = await prisma.member.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Member not found" };

  await prisma.member.update({
    where: { id },
    data: {
      membershipStatus: MembershipStatus.Inactive,
      statusEffectiveDate: new Date(),
    },
  });

  revalidateMemberCaches(id);
  return { success: true, id };
}

export async function reassignUnit(
  id: string,
  newUnit: string,
  assignedDateIso: string
): Promise<ActionResult> {
  const existing = await prisma.member.findUnique({
    where: { id },
    include: { unitHistory: { where: { endDate: null }, take: 1 } },
  });
  if (!existing) return { success: false, error: "Member not found" };
  if (existing.unit === newUnit) {
    return { success: false, error: "Member is already in this unit" };
  }

  const assignedDate = parseDateInput(assignedDateIso);

  await prisma.$transaction(async (tx) => {
    const currentLog = existing.unitHistory[0];
    if (currentLog) {
      await tx.unitAssignmentLog.update({
        where: { id: currentLog.id },
        data: { endDate: assignedDate },
      });
    }
    await tx.unitAssignmentLog.create({
      data: {
        memberId: id,
        unit: newUnit,
        startDate: assignedDate,
        endDate: null,
      },
    });
    await tx.member.update({
      where: { id },
      data: {
        unit: newUnit,
        unitAssignedDate: assignedDate,
      },
    });
  });

  revalidateMemberCaches(id);
  return { success: true, id };
}
