"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/lib/auth/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700"
    >
      {pending ? "Signing in…" : "Login"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Username</span>
        <Input
          name="username"
          autoComplete="username"
          required
          placeholder="Username"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
        />
      </label>
      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
