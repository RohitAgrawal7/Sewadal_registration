import { PrismaClient } from "@/generated/prisma";
import { clearDatabaseReady, ensureDatabase } from "./ensure-database";
import { withDbRetry } from "./db/helpers";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  prismaReady: Promise<void> | undefined;
};

function rebuildPostgresUrl(parsed: URL): string {
  const user = encodeURIComponent(decodeURIComponent(parsed.username));
  const pass = encodeURIComponent(decodeURIComponent(parsed.password));
  const qs = parsed.searchParams.toString();
  return `postgresql://${user}:${pass}@${parsed.host}${parsed.pathname}${
    qs ? `?${qs}` : ""
  }`;
}

/**
 * Normalize Supabase pooler URLs for Prisma + serverless:
 * - Transaction pooler (6543) + pgbouncer=true avoids session-mode max-client errors
 * - connection_limit=1 keeps Next.js from exhausting the tiny pooler pool
 */
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

  try {
    const parsed = new URL(url);
    const isPooler =
      parsed.hostname.includes("pooler.supabase.com") ||
      parsed.hostname.includes("pooler.supabase.co");
    if (isPooler) {
      if (parsed.port === "5432" || parsed.port === "") {
        parsed.port = "6543";
      }
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true");
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1");
      }
      if (!parsed.searchParams.has("sslmode")) {
        parsed.searchParams.set("sslmode", "require");
      }
      if (!parsed.searchParams.has("connect_timeout")) {
        parsed.searchParams.set("connect_timeout", "10");
      }
      url = rebuildPostgresUrl(parsed);
    }
  } catch {
    // Keep original URL if parsing fails.
  }

  return url;
}

function createPrismaClient(url: string) {
  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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
  return withDbRetry("readyPrisma", async () => {
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
  });
}

/**
 * Proxy keeps call sites using `prisma.x`, but does NOT wrap model methods.
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
