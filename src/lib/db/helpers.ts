import type { PrismaClient } from "@/generated/prisma";

export const WRITE_CHUNK = 40;

export function chunkArray<T>(items: T[], size = WRITE_CHUNK): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Prisma rejects `in: []` — return undefined filter when empty. */
export function idInFilter(ids: number[]): { in: number[] } | undefined {
  return ids.length > 0 ? { in: ids } : undefined;
}

export function isTransientDbError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  return /EMAXCONN|max clients reached|P1001|P1017|P2024|Can't reach database|timed out|ECONNRESET|ETIMEDOUT|connection pool|Server has closed the connection|40P01|57P01/i.test(
    msg
  );
}

export async function withDbRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isTransientDbError(error) || i === attempts - 1) throw error;
      const waitMs = 150 * (i + 1) * (i + 1);
      console.warn(
        `[db] ${label} transient failure (attempt ${i + 1}/${attempts}), retry in ${waitMs}ms`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw last;
}

export function publicDbError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/EMAXCONN|max clients reached|P2024|connection pool/i.test(msg)) {
    return "Database is busy (connection pool full). Use Supabase Transaction pooler port 6543 with pgbouncer=true&connection_limit=1, then retry.";
  }
  if (/DATABASE_URL|Can't reach database|P1001|P1000|P1017/i.test(msg)) {
    return "Database is unavailable. Check DATABASE_URL (Supabase pooler port 6543) and redeploy.";
  }
  if (/sewadal|does not exist|P2021/i.test(msg)) {
    return "Database tables missing in schema sewadal. Run: npx prisma db push";
  }
  if (/Unique constraint|P2002/i.test(msg)) {
    return "A record with that unique value already exists.";
  }
  const short = msg.replace(/\s+/g, " ").trim().slice(0, 200);
  return short ? `${fallback}: ${short}` : fallback;
}

/** Run async work one-after-another (safe with connection_limit=1). */
export async function runSequential<T>(
  tasks: Array<() => Promise<T>>
): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

export type DbClient = PrismaClient;
