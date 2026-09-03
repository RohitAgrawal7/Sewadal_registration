import type { PrismaClient } from "@prisma/client";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "gender" TEXT,
    "dateOfBirth" DATETIME NOT NULL,
    "nationalIdType" TEXT NOT NULL,
    "nationalIdNumber" TEXT,
    "photoUrl" TEXT,
    "email" TEXT NOT NULL,
    "phonePrimary" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "stateRegion" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "unit" TEXT NOT NULL,
    "unitAssignedDate" DATETIME NOT NULL,
    "role" TEXT,
    "sewaRole" TEXT NOT NULL DEFAULT 'Sewadal',
    "fatherHusbandName" TEXT,
    "qualification" TEXT,
    "profession" TEXT,
    "skills" TEXT,
    "bloodGroup" TEXT,
    "identityDocUrl" TEXT,
    "registrationDate" DATETIME NOT NULL,
    "membershipStatus" TEXT NOT NULL DEFAULT 'Active',
    "statusEffectiveDate" DATETIME NOT NULL,
    "lastRenewalDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Member_email_key" ON "Member"("email");

CREATE TABLE IF NOT EXISTS "UnitAssignmentLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    CONSTRAINT "UnitAssignmentLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UnitAssignmentLog_memberId_idx" ON "UnitAssignmentLog"("memberId");

CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_memberId_date_key" ON "AttendanceRecord"("memberId", "date");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");
CREATE INDEX IF NOT EXISTS "AttendanceRecord_memberId_idx" ON "AttendanceRecord"("memberId");

CREATE TABLE IF NOT EXISTS "AttendanceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "topic" TEXT,
    "sanchalanSewa" TEXT,
    "stageSewa" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceSession_date_key" ON "AttendanceSession"("date");

CREATE TABLE IF NOT EXISTS "AppUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_username_key" ON "AppUser"("username");
`;

let readyPromise: Promise<void> | null = null;

export function ensureDatabase(client: PrismaClient): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        await client.$queryRaw`SELECT 1 FROM AppUser LIMIT 1`;
      } catch {
        for (const statement of SCHEMA_SQL.split(";")
          .map((s) => s.trim())
          .filter(Boolean)) {
          await client.$executeRawUnsafe(statement);
        }
      }
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
