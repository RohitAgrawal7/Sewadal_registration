"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-sky-600 via-blue-700 to-amber-700 text-base font-semibold shadow-lg shadow-sky-600/25 transition hover:from-sky-500 hover:via-blue-600 hover:to-amber-600 hover:shadow-sky-500/30 active:scale-[0.99]"
    >
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-700">Username</span>
        <div
          className={cn(
            "group flex items-center gap-3 rounded-xl border bg-white px-3.5 py-1 transition-all duration-200",
            userFocused
              ? "border-sky-400 shadow-md shadow-sky-500/15 ring-4 ring-sky-500/15"
              : "border-slate-200 hover:border-sky-300"
          )}
        >
          <span className="text-slate-400 transition group-focus-within:text-sky-600" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20 21a8 8 0 10-16 0" strokeLinecap="round" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </span>
          <input
            name="username"
            autoComplete="username"
            required
            placeholder="Enter username"
            onFocus={() => setUserFocused(true)}
            onBlur={() => setUserFocused(false)}
            className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-700">Password</span>
        <div
          className={cn(
            "group flex items-center gap-3 rounded-xl border bg-white px-3.5 py-1 transition-all duration-200",
            passFocused
              ? "border-amber-400 shadow-md shadow-amber-500/15 ring-4 ring-amber-500/15"
              : "border-slate-200 hover:border-amber-300"
          )}
        >
          <span className="text-slate-400 transition group-focus-within:text-sky-600" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter password"
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
            className="h-11 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      {state?.error && (
        <p className="animate-in rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
