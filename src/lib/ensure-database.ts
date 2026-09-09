import type { PrismaClient } from "@/generated/prisma";

const readyByUrl = new Map<string, Promise<void>>();

const CORE_TABLES = [
  "AppUser",
  "Member",
  "AttendanceRecord",
  "AttendanceSession",
  "UnitAssignmentLog",
] as const;

async function ensureRegistryStatusColumn(client: PrismaClient) {
  try {
    await client.$queryRaw`SELECT "registryStatus" FROM sewadal."Member" LIMIT 1`;
  } catch {
    try {
      await client.$executeRawUnsafe(
        `ALTER TABLE sewadal."Member" ADD COLUMN IF NOT EXISTS "registryStatus" TEXT NOT NULL DEFAULT 'Registered'`
      );
    } catch (error) {
      console.warn("Could not ensure registryStatus column", error);
    }
  }
}

/** One round-trip: confirm schema + core tables exist. */
async function verifyCoreTables(client: PrismaClient) {
  const rows = await client.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'sewadal'
      AND table_name IN (
        'AppUser',
        'Member',
        'AttendanceRecord',
        'AttendanceSession',
        'UnitAssignmentLog'
      )
  `;
  const found = new Set(rows.map((r) => r.table_name));
  const missing = CORE_TABLES.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Database tables missing in schema sewadal: ${missing.join(", ")}. Run: npx prisma db push`
    );
  }
}

/** Drop cached readiness so the next call re-runs health checks (e.g. after client rebuild). */
export function clearDatabaseReady(url?: string) {
  if (url) readyByUrl.delete(url);
  else readyByUrl.clear();
}

/** Light health check. Schema is applied with `prisma db push`. */
export function ensureDatabase(
  client: PrismaClient,
  url: string
): Promise<void> {
  let pending = readyByUrl.get(url);
  if (!pending) {
    pending = (async () => {
      await client.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS sewadal`);
      await client.$queryRaw`SELECT 1`;
      try {
        await verifyCoreTables(client);
      } catch (error) {
        console.error(
          "Database tables missing in schema sewadal. Run locally: npx prisma db push",
          error
        );
        throw error;
      }
      await ensureRegistryStatusColumn(client);
    })().catch((error) => {
      readyByUrl.delete(url);
      throw error;
    });
    readyByUrl.set(url, pending);
  }
  return pending;
}
