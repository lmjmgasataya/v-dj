"use client";

import { useState, useTransition } from "react";
import { registerForEvent } from "../actions";
import { useToast } from "@/components/toast/ToastProvider";

interface InternOption {
  id: number;
  lastName: string;
  firstName: string;
}

export function EventRegistrationForm({
  eventId,
  audience,
  defaultWillAttend,
  interns,
  defaultInternIds,
}: {
  eventId: number;
  audience: ("vg_leader" | "intern")[];
  defaultWillAttend: boolean | null;
  interns: InternOption[];
  defaultInternIds: number[];
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [willAttend, setWillAttend] = useState<boolean | null>(defaultWillAttend);
  const [selectedInternIds, setSelectedInternIds] = useState<Set<number>>(new Set(defaultInternIds));

  const showAttendance = audience.includes("vg_leader");
  const showInterns = audience.includes("intern") && interns.length > 0;

  function toggleIntern(id: number) {
    setSelectedInternIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await registerForEvent(eventId, formData);
      toast.show("Registration saved.", "success");
    });
  }

  const canSubmit = !showAttendance || willAttend !== null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
      {showAttendance && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Will you attend? <span className="text-red-500">*</span></p>
          <input type="hidden" name="willAttend" value={willAttend === null ? "" : String(willAttend)} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWillAttend(true)}
              className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border transition ${
                willAttend === true
                  ? "bg-[#00428E] text-white border-[#00428E]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              I will attend
            </button>
            <button
              type="button"
              onClick={() => setWillAttend(false)}
              className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border transition ${
                willAttend === false
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              I won&apos;t be able to attend
            </button>
          </div>
        </div>
      )}

      {showInterns && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Which of your interns will attend?</p>
          <div className="flex flex-col gap-2">
            {interns.map((i) => (
              <label
                key={i.id}
                className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  name="internId"
                  value={i.id}
                  checked={selectedInternIds.has(i.id)}
                  onChange={() => toggleIntern(i.id)}
                />
                <span className="text-sm text-gray-900">{i.lastName}, {i.firstName}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="self-end bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
      >
        {pending ? "Saving..." : "Save Registration"}
      </button>
    </form>
  );
}
