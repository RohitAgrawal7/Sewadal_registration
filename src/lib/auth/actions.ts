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

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "Enter username and password" };
  }

  const user = await getUserForLogin(username);
  if (!user) {
    return { error: "Invalid username or password" };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid username or password" };
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
  });
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions());
  redirect("/");
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
