"use client";

import { useActionState } from "react";
import { useState } from "react";
import Link from "next/link";
import { updateSession } from "./actions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckboxOption } from "@/components/form";
import { DatePickerField } from "@/components/DatePickerField";

export function EditSessionForm({
  session,
  existingNames,
  newDatePicker,
}: {
  session: { id: number; name: string; sessionDate: string; requiresVictoryDay: boolean; allowsWalkIn: boolean; batchId: number | null };
  existingNames: string[];
  newDatePicker: boolean;
}) {
  const isCustom = !existingNames.includes(session.name);
  const [mode, setMode] = useState<"existing" | "custom">(isCustom ? "custom" : "existing");

  const action = updateSession.bind(null, session.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sessions", href: "/sessions" }, { label: session.name, href: `/sessions/${session.id}` }, { label: "Edit" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Edit Session</h2>
      </div>

      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium w-fit">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`px-4 py-2 transition ${mode === "existing" ? "bg-[#00428E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Use existing name
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`px-4 py-2 transition border-l border-gray-200 ${mode === "custom" ? "bg-[#00428E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          Custom
        </button>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
        {session.batchId && <input type="hidden" name="batchId" value={session.batchId} />}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session Name</label>
          {mode === "existing" ? (
            <select
              name="name"
              required
              defaultValue={isCustom ? "" : session.name}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              <option value="">-- Select --</option>
              {existingNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          ) : (
            <input
              name="name"
              required
              defaultValue={session.name}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session Date</label>
          <DatePickerField
            name="sessionDate"
            required
            defaultValue={session.sessionDate}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            newDatePicker={newDatePicker}
          />
        </div>

        <CheckboxOption name="requiresVictoryDay" value="true" defaultChecked={session.requiresVictoryDay} labelClassName="font-medium">
          Require Victory Day completion before check-in
        </CheckboxOption>

        <CheckboxOption name="allowsWalkIn" value="true" defaultChecked={session.allowsWalkIn} labelClassName="font-medium">
          Allow walk-in registration for this session
        </CheckboxOption>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Link
            href={`/sessions/${session.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
