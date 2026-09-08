import type { PrismaClient } from "@/generated/prisma";

let readyPromise: Promise<void> | null = null;

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

/** Light health check. Schema is applied with `prisma db push`. */
export function ensureDatabase(client: PrismaClient): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await client.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS sewadal`);
      await client.$queryRaw`SELECT 1`;
      try {
        await client.$queryRaw`SELECT 1 FROM sewadal."AppUser" LIMIT 1`;
      } catch (error) {
        console.error(
          "Database tables missing in schema sewadal. Run locally: npx prisma db push",
          error
        );
        throw error;
      }
      await ensureRegistryStatusColumn(client);
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  return readyPromise;
}
