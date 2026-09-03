import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_USERNAME = "Sewadal2026";
const DEFAULT_PASSWORD = "Jagruti@1";

type UserRow = {
  id: string;
  username: string;
  passwordHash: string;
};

type UserDelegate = {
  findUnique: (args: {
    where: { username: string };
  }) => Promise<UserRow | null>;
  create: (args: {
    data: { username: string; passwordHash: string };
  }) => Promise<UserRow>;
};

function userDelegate(): UserDelegate | undefined {
  return (prisma as unknown as { appUser?: UserDelegate }).appUser;
}

async function findUserByUsername(username: string): Promise<UserRow | null> {
  const delegate = userDelegate();
  if (delegate) {
    return delegate.findUnique({ where: { username } });
  }

  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, username, passwordHash
    FROM AppUser
    WHERE username = ${username}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function createUser(username: string, passwordHash: string): Promise<UserRow> {
  const delegate = userDelegate();
  if (delegate) {
    return delegate.create({ data: { username, passwordHash } });
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await prisma.$executeRaw`
    INSERT INTO AppUser (id, username, passwordHash, createdAt, updatedAt)
    VALUES (${id}, ${username}, ${passwordHash}, ${now}, ${now})
  `;
  return { id, username, passwordHash };
}

async function renameUser(fromUsername: string, toUsername: string) {
  await prisma.$executeRaw`
    UPDATE AppUser SET username = ${toUsername} WHERE username = ${fromUsername}
  `;
}

export async function ensureDefaultUser() {
  const username = process.env.AUTH_USERNAME || DEFAULT_USERNAME;
  const password = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD;

  const existing = await findUserByUsername(username);
  if (existing) return existing;

  const previous = await findUserByUsername("Swaadal2026");
  if (previous) {
    await renameUser("Swaadal2026", username);
    return { ...previous, username };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return createUser(username, passwordHash);
}

export async function getUserForLogin(username: string) {
  await ensureDefaultUser();
  return findUserByUsername(username);
}
