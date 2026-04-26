"use client";

import { useRef, useState } from "react";
import { inputCls } from "./form";
import type { Discipler } from "@/db/schema";

interface Props {
  onSelect: (d: Discipler) => void;
}

export function DisciplerAutocomplete({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Discipler[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/disciplers?q=${encodeURIComponent(val)}`);
      const data: Discipler[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function handleSelect(d: Discipler) {
    onSelect(d);
    setQuery(`${d.lastName}, ${d.firstName}`);
    setOpen(false);
  }

  return (
    <div className="sm:col-span-2 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search existing discipler
        <span className="ml-2 text-xs font-normal text-gray-400">(type to autofill fields below)</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type last name or first name..."
        className={inputCls}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={() => handleSelect(d)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-gray-900">{d.lastName}, {d.firstName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {d.mobileNumber}{d.messengerName ? ` · ${d.messengerName}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
