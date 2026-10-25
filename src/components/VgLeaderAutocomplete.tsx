"use client";

import { useState } from "react";
import { inputCls } from "./form";
import { searchVgLeaders, type VgLeaderOption } from "@/lib/vgLeaderSearch";

interface Props {
  options: VgLeaderOption[];
  onSelect: (v: VgLeaderOption) => void;
}

export function VgLeaderAutocomplete({ options, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VgLeaderOption[]>([]);
  const [open, setOpen] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    const found = searchVgLeaders(options, val);
    setResults(found);
    setOpen(found.length > 0);
  }

  function handleSelect(v: VgLeaderOption) {
    onSelect(v);
    setQuery(`${v.lastName}, ${v.firstName}`);
    setOpen(false);
  }

  return (
    <div className="sm:col-span-2 relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Search existing VG Leader
        <span className="ml-2 text-xs font-normal text-gray-400">(type to autofill fields below)</span>
      </label>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type last name, first name, or nickname..."
        className={inputCls}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {results.map((v) => (
            <button
              key={v.id}
              type="button"
              onMouseDown={() => handleSelect(v)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-gray-900">{v.lastName}, {v.firstName}{v.nickname ? ` (${v.nickname})` : ""}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {v.mobileNumber}{v.facebookMessengerName ? ` · ${v.facebookMessengerName}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
