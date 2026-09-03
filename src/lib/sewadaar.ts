export const TYPE_LABELS = {
  Male: "Gents",
  Female: "Ladies",
  Child: "Children",
} as const;

export const QUALIFICATIONS = [
  "Below 10th",
  "10th",
  "12th",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Doctorate",
  "Other",
] as const;

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const SKILL_OPTIONS = [
  "Accountant",
  "Actor",
  "Acupuncturist",
  "Administrator",
  "Architect",
  "Artist",
  "Carpenter",
  "Chef",
  "Computer Operator",
  "Counselor",
  "Designer",
  "Doctor",
  "Driver",
  "Electrician",
  "Engineer",
  "Farmer",
  "First Aid",
  "Graphic Designer",
  "IT / Software",
  "Lawyer",
  "Musician",
  "Nurse",
  "Photographer",
  "Plumber",
  "Public Speaking",
  "Singer",
  "Teacher",
  "Translator",
  "Video Editor",
  "Volunteer Coordinator",
] as const;

export function parseSkills(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinSkills(skills: string[]): string {
  return Array.from(new Set(skills)).join(", ");
}

export const SEWA_ROLES = [
  "Sewadal",
  "UnitIncharge",
  "SahayakShishika",
  "Shishika",
  "KshetriyaSanchalak",
  "Sanchalak",
] as const;

export type SewaRole = (typeof SEWA_ROLES)[number];

export const SEWA_ROLE_LABELS: Record<SewaRole, string> = {
  Sewadal: "Sewadal",
  UnitIncharge: "Unit Incharge",
  SahayakShishika: "Sahayak Shishika",
  Shishika: "Shishika",
  KshetriyaSanchalak: "Kshetriya Sanchalak",
  Sanchalak: "Sanchalak",
};

export const OFFICE_ROLE_ROWS: SewaRole[][] = [
  ["KshetriyaSanchalak", "Sanchalak"],
  ["UnitIncharge"],
  ["Shishika", "SahayakShishika"],
];

export function normalizeSewaRole(value: string | null | undefined): SewaRole {
  if (value && (SEWA_ROLES as readonly string[]).includes(value)) {
    return value as SewaRole;
  }
  return "Sewadal";
}

export function isSewadal(value: string | null | undefined): boolean {
  return normalizeSewaRole(value) === "Sewadal";
}
