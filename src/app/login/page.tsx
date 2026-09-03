import { orgSettings } from "@/lib/org-settings";
import { ensureDefaultUser } from "@/lib/auth/ensure-user";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureDefaultUser();

  return (
    <div className="flex min-h-[calc(100vh-0px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {orgSettings.locationName}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to open the sewadaar registry
          </p>
        </div>
        <div className="px-6 py-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
