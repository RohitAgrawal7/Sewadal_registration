/**
 * Prisma generate needs a nonempty DATABASE_URL even though it does not connect.
 * On Vercel, set the real Supabase URL in Project Settings → Environment Variables.
 * This fallback only keeps `prisma generate` from failing when the var is missing/empty.
 */
import { spawnSync } from "node:child_process";

const placeholder =
  "postgresql://build:build@127.0.0.1:5432/postgres?schema=sewadal";

if (!process.env.DATABASE_URL?.trim()) {
  console.warn(
    "[prisma-generate] DATABASE_URL is empty — using a local placeholder for generate only.\n" +
      "Set DATABASE_URL in Vercel (Production + Preview, available at Build time) to your Supabase URL."
  );
  process.env.DATABASE_URL = placeholder;
}

const result = spawnSync("npx", ["prisma", "generate"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
