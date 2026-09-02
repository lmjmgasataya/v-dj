"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { updateEvent } from "./actions";
import { DatePickerField } from "@/components/DatePickerField";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckboxOption } from "@/components/form";
import { useToast } from "@/components/toast/ToastProvider";
import type { Event } from "@/db/schema";

export function EditEventForm({ event, newDatePicker }: { event: Event; newDatePicker: boolean }) {
  const [state, action, pending] = useActionState(updateEvent.bind(null, event.id), undefined);
  const toast = useToast();

  useEffect(() => {
    if (state?.error) toast.show(state.error, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Event Registration", href: "/event-registration" },
            { label: "Events", href: "/event-registration/events" },
            { label: event.name },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Name</label>
          <input
            name="name"
            required
            defaultValue={event.name}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Description <span className="normal-case text-gray-400">(optional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            placeholder="Details attendees should know about this event"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Date</label>
          <DatePickerField
            name="eventDate"
            required
            defaultValue={event.eventDate}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            newDatePicker={newDatePicker}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Audience</label>
          <CheckboxOption name="audience" value="vg_leader" defaultChecked={event.audience.includes("vg_leader")} labelClassName="font-medium">
            Victory Group Leaders
          </CheckboxOption>
          <CheckboxOption name="audience" value="intern" defaultChecked={event.audience.includes("intern")} labelClassName="font-medium">
            Interns
          </CheckboxOption>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <CheckboxOption name="isDone" defaultChecked={event.isDone} labelClassName="font-medium">
            Mark this event as done
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
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
