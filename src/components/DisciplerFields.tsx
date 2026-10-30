"use client";

import { useState } from "react";
import { Field, inputCls } from "./form";
import { MOBILE_NUMBER_PATTERN, MOBILE_NUMBER_HELP } from "@/lib/phone";
import { searchVgLeaders, type VgLeaderOption } from "@/lib/vgLeaderSearch";

interface Props {
  /** Disciplers are VG leaders, so this takes the same preloaded list as VgLeaderFields. */
  options: VgLeaderOption[];
  enabled?: boolean;
  defaultLastName?: string;
  defaultFirstName?: string;
  defaultMobileNumber?: string;
  defaultMessengerName?: string;
}

export function DisciplerFields({
  options,
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
  const [results, setResults] = useState<VgLeaderOption[]>([]);
  const [open, setOpen] = useState(false);

  function search(q: string) {
    if (!enabled) return;
    const found = searchVgLeaders(options, q);
    setResults(found);
    setOpen(found.length > 0);
  }

  function handleSelect(d: VgLeaderOption) {
    setLastName(d.lastName);
    setFirstName(d.firstName);
    setMobileNumber(d.mobileNumber ?? "");
    setMessengerName(d.facebookMessengerName ?? "");
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
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {results.map((d) => (
              <button
                key={d.id}
                type="button"
                onMouseDown={() => handleSelect(d)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition border-b border-gray-100 last:border-0"
              >
                <p className="font-medium text-gray-900">{d.lastName}, {d.firstName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {d.mobileNumber}{d.facebookMessengerName ? ` · ${d.facebookMessengerName}` : ""}
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
          pattern={MOBILE_NUMBER_PATTERN}
          placeholder="09XXXXXXXXX"
          className={inputCls}
          autoComplete="off"
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          onInvalid={(e) => {
            const input = e.currentTarget;
            if (input.validity.patternMismatch) {
              input.setCustomValidity(MOBILE_NUMBER_HELP);
            } else {
              input.setCustomValidity("");
            }
          }}
          onInput={(e) => e.currentTarget.setCustomValidity("")}
        />
      </Field>

      <Field label="Discipler's Messenger / Facebook Name" required>
        <input
          name="disciplerMessengerName"
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
