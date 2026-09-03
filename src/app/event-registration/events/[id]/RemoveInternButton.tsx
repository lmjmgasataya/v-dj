"use client";

import { useRef } from "react";
import { removeInternEventRegistration } from "../../check-in/actions";

export function RemoveInternButton({ eventId, internId, name }: { eventId: number; internId: number; name: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm(`Remove "${name}" from this event's registered list?`)) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={removeInternEventRegistration}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="internId" value={internId} />
      <button
        type="button"
        onClick={handleClick}
        className="text-xs font-medium text-red-500 hover:text-red-700 underline"
      >
        Remove
      </button>
    </form>
  );
}
