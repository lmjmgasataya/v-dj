"use client";

import { useRef, useState } from "react";
import { Field, inputCls } from "./form";
import type { VictoryGroupLeader } from "@/db/schema";

interface Props {
  enabled?: boolean;
  defaultLastName?: string;
  defaultFirstName?: string;
  defaultMobileNumber?: string;
  defaultMessengerName?: string;
}

export function VgLeaderFields({
  enabled = true,
  defaultLastName = "",
  defaultFirstName = "",
  defaultMobileNumber = "",
  defaultMessengerName = "",
}: Props) {
  const [lastName, setLastName] = useState(defaultLastName);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [mobileNumber, setMobileNumber] = useState(defaultMobileNumber);
  const [messengerName, setMessengerName] = useState(defaultMessengerName);
  const [results, setResults] = useState<VictoryGroupLeader[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function search(q: string) {
    if (!enabled) return;
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/vg-leaders?q=${encodeURIComponent(q)}`);
      const data: VictoryGroupLeader[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function handleSelect(v: VictoryGroupLeader) {
    setLastName(v.lastName);
    setFirstName(v.firstName);
    setMobileNumber(v.mobileNumber);
    setMessengerName(v.facebookMessengerName ?? "");
    setOpen(false);
  }

  return (
    <>
      <div className="relative">
        <Field label="VG Leader's Last Name" required>
          <input
            name="vgLeaderLastName"
            required
            className={inputCls}
            autoComplete="off"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); search(e.target.value); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </Field>
        {open && (
          <Dropdown results={results} onSelect={handleSelect} />
        )}
      </div>

      <Field label="VG Leader's First Name" required>
        <input
          name="vgLeaderFirstName"
          required
          className={inputCls}
          autoComplete="off"
          value={firstName}
          onChange={(e) => { setFirstName(e.target.value); search(e.target.value); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </Field>

      <Field label="VG Leader's Mobile Number" required>
        <input
          name="vgLeaderMobileNumber"
          required
          type="tel"
          className={inputCls}
          autoComplete="off"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
        />
      </Field>

      <Field label="VG Leader's Messenger / Facebook Name" required>
        <input
          name="vgLeaderMessengerName"
          required
          className={inputCls}
          autoComplete="off"
          value={messengerName}
          onChange={(e) => setMessengerName(e.target.value)}
        />
      </Field>
    </>
  );
}

function Dropdown({ results, onSelect }: { results: VictoryGroupLeader[]; onSelect: (v: VictoryGroupLeader) => void }) {
  return (
    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {results.map((v) => (
        <button
          key={v.id}
          type="button"
          onMouseDown={() => onSelect(v)}
          className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
        >
          <p className="font-medium text-gray-900">{v.lastName}, {v.firstName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {v.mobileNumber}{v.facebookMessengerName ? ` · ${v.facebookMessengerName}` : ""}
          </p>
        </button>
      ))}
    </div>
  );
}
