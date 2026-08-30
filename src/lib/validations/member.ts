import { z } from "zod";
import {
  Gender,
  GENDERS,
  MembershipStatus,
  MEMBERSHIP_STATUSES,
  NationalIdType,
  NATIONAL_ID_TYPES,
  Unit,
  UNITS,
} from "@/lib/enums";

const phoneRegex = /^\+?[\d\s()-]{7,20}$/;

export const memberFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  preferredName: z.string().optional().or(z.literal("")),
  gender: z
    .enum(GENDERS as [Gender, ...Gender[]])
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((v) => {
      const [y, m, d] = v.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return date <= today;
    }, "Date of birth cannot be in the future"),
  nationalIdType: z.enum(NATIONAL_ID_TYPES as [NationalIdType, ...NationalIdType[]], {
    required_error: "ID type is required",
  }),
  nationalIdNumber: z.string().optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),

  email: z.string().min(1, "Email is required").email("Invalid email"),
  phonePrimary: z
    .string()
    .min(1, "Primary phone is required")
    .regex(phoneRegex, "Invalid phone number"),
  phoneSecondary: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  stateRegion: z.string().min(1, "State/Region is required"),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  emergencyContactName: z.string().optional().or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .optional()
    .or(z.literal("")),

  unit: z.enum(UNITS as [Unit, ...Unit[]], { required_error: "Unit is required" }),
  unitAssignedDate: z.string().min(1, "Unit assigned date is required"),
  role: z.string().optional().or(z.literal("")),

  registrationDate: z.string().min(1, "Registration date is required"),
  membershipStatus: z.enum(
    MEMBERSHIP_STATUSES as [MembershipStatus, ...MembershipStatus[]]
  ),
  statusEffectiveDate: z.string().min(1, "Status effective date is required"),
  lastRenewalDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;

export const GENDER_LABELS: Record<Gender, string> = {
  Male: "Male",
  Female: "Female",
  Child: "Child",
};

export const ID_TYPE_LABELS: Record<NationalIdType, string> = {
  NationalID: "National ID",
  Passport: "Passport",
  DriversLicense: "Driver's License",
  Other: "Other",
};

export const STATUS_LABELS: Record<MembershipStatus, string> = {
  Active: "Active",
  Inactive: "Inactive",
  OnLeave: "On Leave",
  Alumni: "Alumni",
};
