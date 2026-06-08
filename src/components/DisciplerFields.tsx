"use client";

import { useRef, useState } from "react";
import { Field, inputCls } from "./form";
import type { Discipler } from "@/db/schema";

interface Props { enabled?: boolean }

export function DisciplerFields({ enabled = true }: Props) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [messengerName, setMessengerName] = useState("");
  const [results, setResults] = useState<Discipler[]>([]);
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
      const res = await fetch(`/api/disciplers?q=${encodeURIComponent(q)}`);
      const data: Discipler[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function handleSelect(d: Discipler) {
    setLastName(d.lastName);
    setFirstName(d.firstName);
    setMobileNumber(d.mobileNumber);
    setMessengerName(d.messengerName ?? "");
    setOpen(false);
  }

  return (
    <>
      <div className="relative">
        <Field label="Discipler's Last Name" required>
          <input
            name="disciplerLastName"
            required
            className={inputCls}
            autoComplete="off"
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); search(e.target.value); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </Field>
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

      <Field label="Discipler's First Name" required>
        <input
          name="disciplerFirstName"
          required
          className={inputCls}
          autoComplete="off"
          value={firstName}
          onChange={(e) => { setFirstName(e.target.value); search(e.target.value); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </Field>

      <Field label="Discipler's Mobile Number" required>
        <input
          name="disciplerMobileNumber"
          required
          type="tel"
          className={inputCls}
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
        />
      </Field>

      <Field label="Discipler's Messenger / Facebook Name">
        <input
          name="disciplerMessengerName"
          className={inputCls}
          value={messengerName}
          onChange={(e) => setMessengerName(e.target.value)}
        />
      </Field>
    </>
  );
}
