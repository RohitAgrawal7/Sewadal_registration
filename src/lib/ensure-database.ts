import type { PrismaClient } from "@/generated/prisma";

const readyByUrl = new Map<string, Promise<void>>();

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

async function verifyCoreTables(client: PrismaClient) {
  await client.$queryRaw`SELECT 1 FROM sewadal."AppUser" LIMIT 1`;
  await client.$queryRaw`SELECT 1 FROM sewadal."Member" LIMIT 1`;
  await client.$queryRaw`SELECT 1 FROM sewadal."AttendanceRecord" LIMIT 1`;
  await client.$queryRaw`SELECT 1 FROM sewadal."AttendanceSession" LIMIT 1`;
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
