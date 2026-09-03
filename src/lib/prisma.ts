import path from "path";
import { PrismaClient } from "@prisma/client";
import { ensureDatabase } from "./ensure-database";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
  prismaReady: Promise<void> | undefined;
};

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

function databaseUrl() {
  // Writable path on Vercel/Netlify serverless (repo prisma/dev.db is read-only / absent).
  if (isServerlessRuntime()) {
    if (process.env.DATABASE_URL?.startsWith("file:/tmp")) {
      return process.env.DATABASE_URL;
    }
    return "file:/tmp/swaadal.db";
  }

  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw;

  const filePath = raw.slice("file:".length);
  if (path.isAbsolute(filePath)) return `file:${filePath}`;

  const relative = filePath.replace(/^\.\//, "");
  const resolved = relative.startsWith("prisma/")
    ? path.resolve(process.cwd(), relative)
    : path.resolve(process.cwd(), "prisma", relative);
  return `file:${resolved}`;
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
    memberFieldNames(client).includes("sewaRole")
  );
}

function wrapWithReady<T>(client: PrismaClient, value: T): T {
  if (typeof value === "function") {
    return (async (...args: unknown[]) => {
      await (globalForPrisma.prismaReady ?? ensureDatabase(client));
      return (value as (...a: unknown[]) => unknown).apply(client, args);
    }) as T;
  }

  if (value && typeof value === "object") {
    return new Proxy(value as object, {
      get(target, prop, receiver) {
        const inner = Reflect.get(target, prop, receiver);
        if (typeof inner !== "function") return inner;
        return async (...args: unknown[]) => {
          await (globalForPrisma.prismaReady ?? ensureDatabase(client));
          return (inner as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    }) as T;
  }

  return value;
}

export function getPrisma(): PrismaClient {
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

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return undefined;
    }
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    // Keep disconnect/connect synchronous-ish without blocking bootstrap forever.
    if (prop === "$disconnect" || prop === "$connect" || prop === "$on") {
      return typeof value === "function" ? value.bind(client) : value;
    }
    return wrapWithReady(client, value);
  },
});
