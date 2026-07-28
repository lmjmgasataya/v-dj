"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">Victory Iloilo</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            {forced ? "Set a New Password" : "Change Password"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {forced
              ? "An admin reset your password. Enter the temporary password you were given, then set a new one."
              : "Enter your current password, then set a new one."}
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {forced ? "Temporary Password" : "Current Password"}
            </label>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Password</label>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400">At least 6 characters.</p>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition"
          >
            {pending ? "Saving…" : "Save New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
