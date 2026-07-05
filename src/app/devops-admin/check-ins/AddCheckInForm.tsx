"use client";

import { useRef, useState, useTransition } from "react";
import { searchParticipants, createCheckIn } from "./actions";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

type Session = { id: number; name: string; sessionDate: string };
type ParticipantResult = Awaited<ReturnType<typeof searchParticipants>>[number];

export function AddCheckInForm({ sessions }: { sessions: Session[] }) {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ParticipantResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    clearTimeout(timer.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const data = await searchParticipants(val);
      setResults(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function handleSelect(p: ParticipantResult) {
    setSelected(p);
    setQuery(`${p.lastName}, ${p.firstName}`);
    setOpen(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createCheckIn(formData);
      setFormKey((k) => k + 1);
      setQuery("");
      setSelected(null);
      setResults([]);
    });
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Class Session</label>
        <select name="classSessionId" required className={input}>
          <option value="">-- Select --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.sessionDate}</option>
          ))}
        </select>
      </div>
      <div className="relative">
        <label className="block text-xs text-gray-500 mb-1">Participant</label>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by name or mobile number..."
          autoComplete="off"
          className={input}
        />
        <input type="hidden" name="participantId" value={selected?.id ?? ""} />
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => handleSelect(p)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
              >
                <p className="font-medium text-gray-900">{p.lastName}, {p.firstName}</p>
                {p.mobileNumber && <p className="text-xs text-gray-500">{p.mobileNumber}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Remarks (optional)</label>
        <input name="remarks" className={input} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending || !selected}
          className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
