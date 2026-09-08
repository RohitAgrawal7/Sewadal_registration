"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForLogin } from "./ensure-user";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "./session";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "Enter username and password" };
  }

  try {
    const user = await getUserForLogin(username);
    if (!user) {
      return {
        error:
          "Invalid username or password (or database is unavailable). Check DATABASE_URL on Vercel.",
      };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { error: "Invalid username or password" };
    }

    const token = await createSessionToken({
      id: String(user.id),
      username: user.username,
    });
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions());
    redirect("/");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("loginAction failed", error);
    return {
      error:
        "Could not sign in. Database may be unavailable — verify DATABASE_URL on Vercel and try again.",
    };
  }
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
