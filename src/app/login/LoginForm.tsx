"use client";

import { useActionState, useEffect } from "react";
import { login } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";
import { PasswordInput } from "@/components/PasswordInput";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state?.error) toast.show(state.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Victory Iloilo</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Discipleship Journey</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sign in to continue</p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
            <input
              name="username"
              autoComplete="username"
              autoFocus
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</label>
            <PasswordInput
              name="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <a
            href="/vg-portal/claim"
            className="text-xs text-center text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            VG Leader? Go to the VG Portal
          </a>
        </form>
      </div>
    </div>
  );
}
