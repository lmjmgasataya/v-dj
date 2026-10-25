"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Field, inputCls } from "./form";
import { searchVgLeaders, type VgLeaderOption } from "@/lib/vgLeaderSearch";

interface Props {
  options: VgLeaderOption[];
  excludeId: number;
  defaultLastName?: string;
  defaultFirstName?: string;
  defaultId?: number | null;
  required?: boolean;
}

type ActiveField = "last" | "first" | null;

export function OwnVgLeaderField({
  options,
  excludeId,
  defaultLastName = "",
  defaultFirstName = "",
  defaultId = null,
  required = false,
}: Props) {
  const [lastName, setLastName] = useState(defaultLastName);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [id, setId] = useState<number | null>(defaultId);
  const [results, setResults] = useState<VgLeaderOption[]>([]);
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = activeField === "first" ? firstNameRef.current : lastNameRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }

    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open, activeField]);

  function search(q: string) {
    const found = searchVgLeaders(options, q, excludeId);
    setResults(found);
    setOpen(found.length > 0);
  }

  function handleSelect(v: VgLeaderOption) {
    setLastName(v.lastName);
    setFirstName(v.firstName);
    setId(v.id);
    setOpen(false);
  }

  return (
    <>
      <Field label="Last Name of your Victory Group Leader" required={required}>
        <input
          ref={lastNameRef}
          name="ownVgLeaderLastName"
          required={required}
          className={inputCls}
          autoComplete="off"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            setId(null);
            setActiveField("last");
            search(e.target.value);
          }}
          onFocus={() => setActiveField("last")}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Type to search existing VG leaders..."
        />
      </Field>

      <Field label="First Name of your Victory Group Leader" required={required}>
        <input
          ref={firstNameRef}
          name="ownVgLeaderFirstName"
          required={required}
          className={inputCls}
          autoComplete="off"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            setId(null);
            setActiveField("first");
            search(e.target.value);
          }}
          onFocus={() => setActiveField("first")}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </Field>

      <input type="hidden" name="ownVgLeaderId" value={id ?? ""} />

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
            className="z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          >
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
          </div>,
          document.body
        )}
    </>
  );
}
