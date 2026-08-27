"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Field, inputCls } from "./form";
import type { VictoryGroupLeader } from "@/db/schema";

interface Props {
  excludeId: number;
  defaultName?: string;
  defaultId?: number | null;
}

export function OwnVgLeaderField({ excludeId, defaultName = "", defaultId = null }: Props) {
  const [name, setName] = useState(defaultName);
  const [id, setId] = useState<number | null>(defaultId);
  const [results, setResults] = useState<VictoryGroupLeader[]>([]);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function updateRect() {
      const el = inputRef.current;
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
  }, [open]);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    setId(null);
    search(e.target.value);
  }

  function handleSelect(v: VictoryGroupLeader) {
    setName(`${v.lastName}, ${v.firstName}`);
    setId(v.id);
    setOpen(false);
  }

  return (
    <Field label="Name of your Victory Group Leader" className="sm:col-span-2">
      <div className="relative">
        <input
          ref={inputRef}
          name="ownVgLeaderName"
          className={inputCls}
          autoComplete="off"
          value={name}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type to search existing VG leaders..."
        />
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
    </Field>
  );
}
