"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "group mt-1 h-12 w-full rounded-xl text-base font-semibold transition",
        "border border-sky-400/70 bg-gradient-to-r from-amber-300 to-sky-300 text-white shadow-sm",
        "hover:border-sky-500 hover:from-amber-200 hover:to-sky-200",
        "active:border-amber-500 active:bg-white active:from-transparent active:to-transparent active:shadow-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <span
        className={cn(
          "inline-block",
          "group-active:bg-gradient-to-r group-active:from-amber-700 group-active:to-sky-700",
          "group-active:bg-clip-text group-active:text-transparent"
        )}
      >
        {pending ? "Signing in…" : "Sign in"}
      </span>
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const hasError = Boolean(state?.error);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-3 text-sm text-red-800 shadow-sm"
        >
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="font-semibold text-red-900">Sign in failed</p>
            <p className="mt-0.5 text-red-700/90">{state.error}</p>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-700">Username</span>
        <div
          className={cn(
            "group flex items-center gap-3 rounded-xl border bg-white px-3.5 py-1 transition-all duration-200",
            hasError && !userFocused
              ? "border-red-300 ring-2 ring-red-100"
              : userFocused
                ? "border-sky-400 shadow-md shadow-sky-500/15 ring-4 ring-sky-500/15"
                : "border-slate-200 hover:border-sky-300"
          )}
        >
          <span
            className={cn(
              "transition",
              hasError && !userFocused
                ? "text-red-400"
                : "text-slate-400 group-focus-within:text-sky-600"
            )}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M20 21a8 8 0 10-16 0" strokeLinecap="round" />
              <circle cx="12" cy="8" r="4" />
            </svg>
          </span>
          <input
            name="username"
            autoComplete="username"
            required
            aria-invalid={hasError}
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
            hasError && !passFocused
              ? "border-red-300 ring-2 ring-red-100"
              : passFocused
                ? "border-amber-400 shadow-md shadow-amber-500/15 ring-4 ring-amber-500/15"
                : "border-slate-200 hover:border-amber-300"
          )}
        >
          <span
            className={cn(
              "transition",
              hasError && !passFocused
                ? "text-red-400"
                : "text-slate-400 group-focus-within:text-amber-700"
            )}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 118 0v3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={hasError}
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

      <SubmitButton />
    </form>
  );
}
