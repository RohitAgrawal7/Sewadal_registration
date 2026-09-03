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

type MemberWriteData = ReturnType<typeof toMemberData>;

function splitMemberWrite(data: MemberWriteData) {
  const {
    sewaRole,
    fatherHusbandName,
    qualification,
    profession,
    skills,
    bloodGroup,
    identityDocUrl,
    ...core
  } = data;
  return {
    core,
    extra: {
      sewaRole,
      fatherHusbandName,
      qualification,
      profession,
      skills,
      bloodGroup,
      identityDocUrl,
    },
  };
}

async function applySewadaarColumns(
  id: string,
  extra: ReturnType<typeof splitMemberWrite>["extra"]
) {
  // Written with SQL so a stale webpack Prisma client (missing sewaRole) still saves.
  await prisma.$executeRaw`
    UPDATE Member
    SET sewaRole = ${extra.sewaRole},
        fatherHusbandName = ${extra.fatherHusbandName},
        qualification = ${extra.qualification},
        profession = ${extra.profession},
        skills = ${extra.skills},
        bloodGroup = ${extra.bloodGroup},
        identityDocUrl = ${extra.identityDocUrl}
    WHERE id = ${id}
  `;
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
    sewaRole: values.sewaRole,
    registrationDate: parseDateInput(values.registrationDate),
    membershipStatus: values.membershipStatus,
    statusEffectiveDate: parseDateInput(values.statusEffectiveDate),
    lastRenewalDate: values.lastRenewalDate
      ? parseDateInput(values.lastRenewalDate)
      : null,
    notes: emptyToNull(values.notes),
    fatherHusbandName: emptyToNull(values.fatherHusbandName),
    qualification: emptyToNull(values.qualification),
    profession: emptyToNull(values.profession),
    skills: emptyToNull(values.skills),
    bloodGroup: emptyToNull(values.bloodGroup),
    identityDocUrl: emptyToNull(values.identityDocUrl),
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
  sewaRole: string;
  registrationDate: Date;
  membershipStatus: string;
  statusEffectiveDate: Date;
  lastRenewalDate: Date | null;
  notes: string | null;
  fatherHusbandName: string | null;
  qualification: string | null;
  profession: string | null;
  skills: string | null;
  bloodGroup: string | null;
  identityDocUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActionResult =
  | { success: true; id: string; member?: CreatedMemberPayload }
  | { success: false; error: string };

function memberWriteError(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
    return "A member with this email already exists";
  }
  const message =
    e && typeof e === "object" && "message" in e && typeof e.message === "string"
      ? e.message
      : "";
  if (/no such table/i.test(message)) {
    return "Database is not connected. Restart the app and try again.";
  }
  if (/Unknown arg/i.test(message)) {
    return "Database is out of date. Restart the app and try again.";
  }
  return fallback;
}

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
  const { core, extra } = splitMemberWrite(data);

  try {
    const member = await prisma.member.create({
      data: {
        ...core,
        unitHistory: {
          create: {
            unit: data.unit,
            startDate: data.unitAssignedDate,
            endDate: null,
          },
        },
      },
    });
    await applySewadaarColumns(member.id, extra);

    revalidateMemberCaches(member.id);
    return {
      success: true,
      id: member.id,
      member: { ...member, ...extra },
    };
  } catch (e: unknown) {
    console.error("createMember failed", e);
    return { success: false, error: memberWriteError(e, "Failed to create member") };
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
  const { core, extra } = splitMemberWrite(data);
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
          ...core,
          unitAssignedDate: unitChanged
            ? data.unitAssignedDate
            : existing.unitAssignedDate,
        },
      });
    });
    await applySewadaarColumns(id, extra);

    revalidateMemberCaches(id);
    return { success: true, id };
  } catch (e: unknown) {
    console.error("updateMember failed", e);
    return { success: false, error: memberWriteError(e, "Failed to update member") };
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
