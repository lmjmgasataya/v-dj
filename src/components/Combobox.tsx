"use client";

import { useId, useRef, useState } from "react";
import { normalizeName } from "@/lib/vgLeaderMatch";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Smaller second line in the list (e.g. a batch name). */
  hint?: string;
}

interface Props {
  options: ComboboxOption[];
  /** Submitted as a hidden input with the selected option's value. */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  emptyText?: string;
}

/**
 * Dropdown with type-to-filter: every word typed must appear in the label (ignoring case,
 * accents and dots). Only listed options can be chosen; leaving the field restores the
 * selected label.
 */
export function Combobox({ options, name, value, onChange, placeholder, className, emptyText = "No matches" }: Props) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  // Show every option until they type something different from the selected label.
  const typing = query !== (selected?.label ?? "");
  const tokens = typing ? normalizeName(query).split(" ").filter(Boolean) : [];
  const shown = tokens.length
    ? options.filter((o) => {
        const hay = normalizeName(`${o.label} ${o.hint ?? ""}`);
        return tokens.every((t) => hay.includes(t));
      })
    : options;

  function choose(o: ComboboxOption) {
    onChange(o.value);
    setQuery(o.label);
    setOpen(false);
  }

  function move(delta: number) {
    if (!open) return setOpen(true);
    const next = Math.max(0, Math.min(shown.length - 1, active + delta));
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(selected?.label ?? "");
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (shown[active]) choose(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={
          className ??
          "w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        }
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">{emptyText}</li>
          ) : (
            shown.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                // mousedown fires before the input's blur, so the choice lands first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-0 ${
                  i === active ? "bg-indigo-50" : ""
                } ${o.value === value ? "font-semibold text-indigo-800" : "text-gray-800"}`}
              >
                {o.label}
                {o.hint && <span className="block text-xs font-normal text-gray-500">{o.hint}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Free-text input with a suggestion list (every word typed must appear, ignoring case,
 * accents and dots). Unlike Combobox, any text can be kept — a new value is fine.
 */
export function SuggestInput({
  suggestions,
  name,
  value,
  onChange,
  placeholder,
  className,
  required,
}: {
  suggestions: string[];
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const tokens = normalizeName(value).split(" ").filter(Boolean);
  const shown = suggestions.filter((s) => {
    if (s === value) return false;
    const hay = normalizeName(s);
    return tokens.every((t) => hay.includes(t));
  });
  const isNew = value.trim() !== "" && !suggestions.some((s) => s.toLowerCase() === value.trim().toLowerCase());

  function choose(s: string) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!open || shown.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(shown.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={
          className ??
          "w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        }
      />
      {open && (shown.length > 0 || isNew) && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {shown.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-2 text-sm cursor-pointer text-gray-800 border-b border-gray-100 last:border-0 ${i === active ? "bg-indigo-50" : ""}`}
            >
              {s}
            </li>
          ))}
          {isNew && <li className="px-3 py-2 text-xs text-gray-500 bg-gray-50">New topic &ldquo;{value.trim()}&rdquo; will be saved.</li>}
        </ul>
      )}
    </div>
  );
}
