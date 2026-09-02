"use client";

import { useRef, useState, useTransition } from "react";
import { getInternEventRegistration, registerInternForEvent } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";

interface InternResult {
  id: number;
  lastName: string;
  firstName: string;
  leaderLastName: string;
  leaderFirstName: string;
}

export function InternRegistrationForm({ eventId }: { eventId: number }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InternResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<InternResult | null>(null);
  const [willAttend, setWillAttend] = useState<boolean | null>(null);
  const [loadingStatus, startStatusTransition] = useTransition();
  const [saving, startSaveTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);

    if (val.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/interns?q=${encodeURIComponent(val)}`);
      const data: InternResult[] = await res.json();
      setResults(data);
      setSearched(true);
    }, 250);
  }

  function handleSelect(intern: InternResult) {
    setSelected(intern);
    setResults([]);
    setSearched(false);
    setQuery("");
    setWillAttend(null);
    startStatusTransition(async () => {
      const existing = await getInternEventRegistration(eventId, intern.id);
      setWillAttend(existing);
    });
  }

  function handleSave(attend: boolean) {
    if (!selected) return;
    setWillAttend(attend);
    startSaveTransition(async () => {
      await registerInternForEvent(eventId, selected.id, attend);
      toast.show("Registration saved.", "success");
    });
  }

  if (selected) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Registering as</p>
            <p className="text-base font-semibold text-gray-900">
              {selected.lastName}, {selected.firstName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setWillAttend(null);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            Not you? Search again
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Will you attend? <span className="text-red-500">*</span></p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={loadingStatus || saving}
              onClick={() => handleSave(true)}
              className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border transition disabled:opacity-50 ${
                willAttend === true
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              I will attend
            </button>
            <button
              type="button"
              disabled={loadingStatus || saving}
              onClick={() => handleSave(false)}
              className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg border transition disabled:opacity-50 ${
                willAttend === false
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              I won&apos;t be able to attend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">
        Search your name
        <span className="ml-2 text-xs font-normal text-gray-400">(as encoded by your VG Leader)</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Type your last name or first name..."
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        autoComplete="off"
      />

      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {results.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => handleSelect(i)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-gray-900">
                {i.lastName}, {i.firstName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                VG Leader: {i.leaderLastName}, {i.leaderFirstName}
              </p>
            </button>
          ))}
        </div>
      )}

      {searched && results.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          We couldn&apos;t find your name. Please contact your Victory Group Leader so they can add you first.
        </p>
      )}
    </div>
  );
}
