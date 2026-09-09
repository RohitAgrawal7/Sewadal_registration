import { PrismaClient } from "@/generated/prisma";
import { clearDatabaseReady, ensureDatabase } from "./ensure-database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  prismaReady: Promise<void> | undefined;
};

/** Strip quotes/whitespace — common when pasting into Vercel env UI. */
export function resolveDatabaseUrl(): string {
  let url = (process.env.DATABASE_URL ?? "").trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres URL in Vercel Environment Variables."
    );
  }
  return url;
}

function createPrismaClient(url: string) {
  return new PrismaClient({
    datasources: {
      db: { url },
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
  const url = resolveDatabaseUrl();
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
    if (globalForPrisma.prismaUrl) {
      clearDatabaseReady(globalForPrisma.prismaUrl);
    }
  }

  const client = createPrismaClient(url);
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  globalForPrisma.prismaReady = ensureDatabase(client, url).catch((error) => {
    globalForPrisma.prismaReady = undefined;
    clearDatabaseReady(url);
    throw error;
  });
  return client;
}

/** Wait until schema checks finish. Call before every server DB path. */
export async function readyPrisma(): Promise<PrismaClient> {
  const client = getClient();
  const url = globalForPrisma.prismaUrl ?? resolveDatabaseUrl();
  const ready =
    globalForPrisma.prismaReady ?? ensureDatabase(client, url);
  globalForPrisma.prismaReady = ready;
  try {
    await ready;
  } catch (error) {
    globalForPrisma.prismaReady = undefined;
    clearDatabaseReady(url);
    throw error;
  }
  return client;
}

/**
 * Proxy keeps call sites using `prisma.x`, but does NOT wrap model methods
 * (wrapping breaks Prisma `$transaction([...])` which needs real PrismaPromises).
 * Prefer `readyPrisma()` in server code so schema checks always complete first.
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
