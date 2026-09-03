import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

function databaseUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw;

  const filePath = raw.slice("file:".length);
  if (path.isAbsolute(filePath)) return `file:${filePath}`;

  const relative = filePath.replace(/^\.\//, "");
  // Prisma CLI resolves SQLite paths from prisma/schema.prisma (prisma/dev.db).
  // PrismaClient resolves them from process.cwd(), which created an empty
  // root-level dev.db and made member create fail.
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

  // Drop stale cached client after schema or database-path changes.
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
