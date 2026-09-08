import { PrismaClient } from "@/generated/prisma";
import { ensureDatabase } from "./ensure-database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  prismaReady: Promise<void> | undefined;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres URL to .env"
    );
  }
  return url;
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl() },
    },
  });
}

function memberFieldNames(client: PrismaClient): string[] {
  const fields = (
    client as {
      _runtimeDataModel?: { models?: { Member?: { fields?: unknown } } };
    }
  )._runtimeDataModel?.models?.Member?.fields;
  if (Array.isArray(fields)) {
    return fields.map((f: { name?: string }) => f.name).filter(Boolean) as string[];
  }
  if (fields && typeof fields === "object") return Object.keys(fields);
  return [];
}

function hasLatestModels(client: PrismaClient): boolean {
  return (
    typeof (client as { attendanceRecord?: unknown }).attendanceRecord !==
      "undefined" &&
    typeof (client as { attendanceSession?: unknown }).attendanceSession !==
      "undefined" &&
    typeof (client as { appUser?: unknown }).appUser !== "undefined" &&
    memberFieldNames(client).includes("sewaRole") &&
    memberFieldNames(client).includes("registryStatus")
  );
}

function getClient(): PrismaClient {
  const url = databaseUrl();
  const existing = globalForPrisma.prisma;
  if (
    existing &&
    globalForPrisma.prismaUrl === url &&
    hasLatestModels(existing)
  ) {
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaReady = undefined;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  globalForPrisma.prismaReady = ensureDatabase(client);
  return client;
}

/** Wait until schema checks finish. Call before transactions / first query in actions. */
export async function readyPrisma(): Promise<PrismaClient> {
  const client = getClient();
  await (globalForPrisma.prismaReady ?? ensureDatabase(client));
  return client;
}

/**
 * Proxy keeps call sites using `prisma.x`, but does NOT wrap model methods
 * (wrapping breaks Prisma `$transaction([...])` which needs real PrismaPromises).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return undefined;
    }
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
