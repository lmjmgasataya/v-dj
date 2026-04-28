"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

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
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
