"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inputCls } from "./form";
import type { VictoryGroupLeader } from "@/db/schema";

export interface MemberRowValue {
  id: number | null;
  lastName: string;
  firstName: string;
}

type ActiveField = "last" | "first" | null;

function MemberRow({
  namePrefix,
  excludeId,
  value,
  onChange,
  onRemove,
}: {
  namePrefix: string;
  excludeId: number;
  value: MemberRowValue;
  onChange: (next: MemberRowValue) => void;
  onRemove: () => void;
}) {
  const [results, setResults] = useState<VictoryGroupLeader[]>([]);
  const [open, setOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/vg-leaders?q=${encodeURIComponent(q)}&excludeId=${excludeId}`);
      const data: VictoryGroupLeader[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    }, 250);
  }

  function handleSelect(v: VictoryGroupLeader) {
    onChange({ id: v.id, lastName: v.lastName, firstName: v.firstName });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={lastNameRef}
        name={`${namePrefix}_lastName`}
        className={inputCls}
        autoComplete="off"
        value={value.lastName}
        onChange={(e) => {
          onChange({ ...value, id: null, lastName: e.target.value });
          setActiveField("last");
          search(e.target.value);
        }}
        onFocus={() => setActiveField("last")}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Last Name"
      />
      <input
        ref={firstNameRef}
        name={`${namePrefix}_firstName`}
        className={inputCls}
        autoComplete="off"
        value={value.firstName}
        onChange={(e) => {
          onChange({ ...value, id: null, firstName: e.target.value });
          setActiveField("first");
          search(e.target.value);
        }}
        onFocus={() => setActiveField("first")}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="First Name"
      />
      <input type="hidden" name={`${namePrefix}_id`} value={value.id ?? ""} />
      <button type="button" onClick={onRemove} className="shrink-0 text-xs text-red-500 hover:text-red-700 px-2">
        Remove
      </button>

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
                <p className="font-medium text-gray-900">{v.lastName}, {v.firstName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {v.mobileNumber}{v.facebookMessengerName ? ` · ${v.facebookMessengerName}` : ""}
                </p>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export function LeadershipGroupMembersField({
  excludeId,
  defaultMembers,
}: {
  excludeId: number;
  defaultMembers: MemberRowValue[];
}) {
  const [rows, setRows] = useState<MemberRowValue[]>(
    defaultMembers.length ? defaultMembers : [{ id: null, lastName: "", firstName: "" }]
  );

  function updateRow(index: number, next: MemberRowValue) {
    setRows((prev) => prev.map((r, i) => (i === index ? next : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <MemberRow
          key={i}
          namePrefix={`lgl_${i}`}
          excludeId={excludeId}
          value={row}
          onChange={(next) => updateRow(i, next)}
          onRemove={() => removeRow(i)}
        />
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { id: null, lastName: "", firstName: "" }])}
        className="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 bg-white px-3 py-1 rounded-lg transition"
      >
        + Add VG Leader
      </button>
    </div>
  );
}
