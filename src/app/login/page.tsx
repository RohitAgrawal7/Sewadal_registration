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
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 h-40 w-40 overflow-hidden rounded-full bg-white shadow-[0_8px_30px_rgba(14,165,233,0.18)] ring-4 ring-white sm:h-44 sm:w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/login-logo.png?v=5`}
              alt="Sant Nirankari Mission"
              width={176}
              height={176}
              className="h-full w-full object-cover object-center"
              decoding="async"
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
            {orgSettings.locationName}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-800">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to open the sewadaar registry
          </p>
        </div>

        <div className="rounded-2xl border border-sky-100/80 bg-white/95 p-6 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_12px_40px_rgba(37,99,235,0.1)] backdrop-blur-sm sm:p-8">
          {setupError ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 9v4m0 4h.01M10.3 4.3L2.8 17.2A2 2 0 004.5 20h15a2 2 0 001.7-2.8L13.7 4.3a2 2 0 00-3.4 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="font-semibold">Connection issue</p>
                <p className="mt-0.5 text-amber-800/90">{setupError}</p>
              </div>
            </div>
          ) : null}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
