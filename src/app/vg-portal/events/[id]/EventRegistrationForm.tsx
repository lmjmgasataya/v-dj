"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerForEvent } from "../actions";
import { useToast } from "@/components/toast/ToastProvider";

export function EventRegistrationForm({
  eventId,
  audience,
  defaultWillAttend,
}: {
  eventId: number;
  audience: ("vg_leader" | "intern")[];
  defaultWillAttend: boolean | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [willAttend, setWillAttend] = useState<boolean | null>(defaultWillAttend);

  const showAttendance = audience.includes("vg_leader");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await registerForEvent(eventId, formData);
      toast.show("Registration saved.", "success");
      router.push("/vg-portal");
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
                  ? "bg-green-600 text-white border-green-600"
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
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              I won&apos;t be able to attend
            </button>
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
