import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient();
}

function hasAttendanceModels(client: PrismaClient): boolean {
  return (
    typeof (client as { attendanceRecord?: unknown }).attendanceRecord !==
      "undefined" &&
    typeof (client as { attendanceSession?: unknown }).attendanceSession !==
      "undefined"
  );
}

function getPrisma(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && hasAttendanceModels(existing)) {
    return existing;
  }

  // Drop stale cached client after schema changes (dev HMR).
  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrisma();
