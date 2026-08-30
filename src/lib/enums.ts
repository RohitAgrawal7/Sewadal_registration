export const Gender = {
  Male: "Male",
  Female: "Female",
  Child: "Child",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];
export const GENDERS = Object.values(Gender);

export const NationalIdType = {
  NationalID: "NationalID",
  Passport: "Passport",
  DriversLicense: "DriversLicense",
  Other: "Other",
} as const;
export type NationalIdType = (typeof NationalIdType)[keyof typeof NationalIdType];
export const NATIONAL_ID_TYPES = Object.values(NationalIdType);

export const Unit = {
  Unit1: "Unit1",
  Unit2: "Unit2",
  Unit3: "Unit3",
  Unit4: "Unit4",
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];
export const UNITS = Object.values(Unit);

export const MembershipStatus = {
  Active: "Active",
  Inactive: "Inactive",
  OnLeave: "OnLeave",
  Alumni: "Alumni",
} as const;
export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];
export const MEMBERSHIP_STATUSES = Object.values(MembershipStatus);

export const AttendanceStatus = {
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  Excused: "Excused",
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];
export const ATTENDANCE_STATUSES = Object.values(AttendanceStatus);
