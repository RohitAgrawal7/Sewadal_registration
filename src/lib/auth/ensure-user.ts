import bcrypt from "bcryptjs";
import { readyPrisma } from "@/lib/prisma";

const DEFAULT_USERNAME = "Sewadal2026";
const DEFAULT_PASSWORD = "Jagruti@1";

type UserRow = {
  id: number;
  username: string;
  passwordHash: string;
};

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

async function findUserByUsername(username: string): Promise<UserRow | null> {
  const db = await readyPrisma();
  return db.appUser.findUnique({ where: { username } });
}

async function createUser(username: string, passwordHash: string): Promise<UserRow> {
  const db = await readyPrisma();
  return db.appUser.create({ data: { username, passwordHash } });
}

async function renameUser(fromUsername: string, toUsername: string) {
  const db = await readyPrisma();
  await db.appUser.update({
    where: { username: fromUsername },
    data: { username: toUsername },
  });
}

export async function ensureDefaultUser(): Promise<UserRow | null> {
  const username = process.env.AUTH_USERNAME || DEFAULT_USERNAME;
  const password = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;

  try {
    const existing = await findUserByUsername(username);
    if (existing) return existing;

    const previous = await findUserByUsername("Swaadal2026");
    if (previous) {
      await renameUser("Swaadal2026", username);
      return { ...previous, username };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    return createUser(username, passwordHash);
  } catch (error) {
    console.error("ensureDefaultUser failed", error);
    return null;
  }
}

export async function getUserForLogin(username: string): Promise<UserRow> {
  const ensured = await ensureDefaultUser();
  if (!ensured) {
    throw new DatabaseUnavailableError(
      "Database is unavailable. On Vercel, set DATABASE_URL to the Supabase pooler URI and redeploy."
    );
  }
  const user = await findUserByUsername(username);
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }
  return user;
}
