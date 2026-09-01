"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { createEvent } from "./actions";
import { DatePickerField } from "@/components/DatePickerField";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckboxOption } from "@/components/form";
import { useToast } from "@/components/toast/ToastProvider";

export function NewEventForm({ newDatePicker }: { newDatePicker: boolean }) {
  const [state, action, pending] = useActionState(createEvent, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state?.error) toast.show(state.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Event Registration", href: "/event-registration" },
            { label: "Events", href: "/event-registration/events" },
            { label: "New Event" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">New Event</h2>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Leaders' Night"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Date</label>
          <DatePickerField
            name="eventDate"
            required
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            newDatePicker={newDatePicker}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Audience</label>
          <CheckboxOption name="audience" value="vg_leader" labelClassName="font-medium">
            Victory Group Leaders
          </CheckboxOption>
          <CheckboxOption name="audience" value="intern" labelClassName="font-medium">
            Interns
          </CheckboxOption>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Link
            href="/event-registration/events"
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
          >
            {pending ? "Creating…" : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
