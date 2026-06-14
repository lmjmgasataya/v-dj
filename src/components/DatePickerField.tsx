"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";

interface DatePickerFieldProps {
  name: string;
  defaultValue?: string;
  required?: boolean;
  max?: string;
  className?: string;
  newDatePicker?: boolean;
}

function toDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function NewDatePicker({ name, defaultValue, required, max, className }: DatePickerFieldProps) {
  const [selected, setSelected] = useState<Date | undefined>(
    defaultValue ? toDate(defaultValue) : undefined
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const disabled = max ? { after: toDate(max) } : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-lg border px-3 py-2 text-sm flex items-center justify-between gap-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
          selected ? "border-gray-300 text-gray-900" : "border-gray-300 text-gray-400"
        } ${className ?? ""}`}
      >
        <span>{selected ? formatDisplay(selected) : "Pick a date"}</span>
        <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      <input type="hidden" name={name} value={selected ? toValue(selected) : ""} required={required} readOnly />

      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg p-3 select-none">
          <DayPicker
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? (max ? toDate(max) : undefined)}
            onSelect={(date) => {
              setSelected(date);
              setOpen(false);
            }}
            disabled={disabled}
            classNames={{
              root: "text-sm",
              months: "",
              month: "flex flex-col gap-3",
              month_caption: "flex items-center justify-between px-1",
              caption_label: "hidden",
              dropdowns: "flex items-center gap-1",
              dropdown: "text-sm font-medium text-gray-900 bg-transparent border-0 focus:outline-none cursor-pointer",
              dropdown_root: "relative",
              nav: "flex items-center gap-1",
              button_previous: "p-1 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-800",
              button_next: "p-1 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-800",
              weeks: "border-collapse",
              weekdays: "",
              weekday: "w-8 h-7 text-center text-xs font-medium text-gray-400",
              week: "",
              day: "p-0 text-center",
              day_button: "w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer",
              selected: "bg-[#00428E] text-white rounded-lg hover:bg-[#00428E] hover:text-white font-medium",
              today: "text-indigo-600 font-semibold",
              disabled: "text-gray-300 cursor-not-allowed pointer-events-none",
              outside: "text-gray-300 opacity-50",
            }}
          />
        </div>
      )}
    </div>
  );
}

export function DatePickerField(props: DatePickerFieldProps) {
  if (!props.newDatePicker) {
    return (
      <input
        type="date"
        name={props.name}
        defaultValue={props.defaultValue}
        required={props.required}
        max={props.max}
        className={props.className}
      />
    );
  }
  return <NewDatePicker {...props} />;
}
