import Image from "next/image";
import { orgSettings } from "@/lib/org-settings";
import { ensureDefaultUser } from "@/lib/auth/ensure-user";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let setupError: string | null = null;
  try {
    await ensureDefaultUser();
  } catch (error) {
    console.error("Login page database setup failed", error);
    setupError =
      "Database is starting up or unavailable. Wait a moment and refresh.";
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_5%,rgba(56,189,248,0.35),transparent_55%),radial-gradient(ellipse_55%_45%_at_90%_15%,rgba(217,119,6,0.28),transparent_50%),radial-gradient(ellipse_50%_40%_at_50%_100%,rgba(37,99,235,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px]"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 to-amber-50 shadow-lg shadow-sky-600/15 ring-1 ring-sky-200/80">
            <Image
              src="/logo.png"
              alt="Sewadal Management Sewa"
              width={64}
              height={64}
              className="h-16 w-16 object-cover"
              priority
            />
          </div>
          <p className="bg-gradient-to-r from-sky-700 to-amber-800 bg-clip-text text-[11px] font-semibold uppercase tracking-[0.18em] text-transparent">
            {orgSettings.locationName}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to open the sewadaar registry
          </p>
        </div>

        <div className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/50 p-6 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_40px_rgba(37,99,235,0.12)] backdrop-blur-sm sm:p-8">
          {setupError ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {setupError}
            </p>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
