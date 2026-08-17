"use client";

import { useEffect, useRef, useState } from "react";
import { setCheckinFlag } from "./actions";

const CHECKIN_SETTINGS = [
  {
    key: "checkin_confirm_popup" as const,
    label: "Confirmation popup before check-in",
    description: "When off, clicking Check In or scanning a QR code checks the participant in immediately.",
  },
  {
    key: "checkin_autocheckin" as const,
    label: "Auto check-in before 9:00 AM",
    description: "Arrivals on or before 9:00 AM skip the confirmation popup and are marked On-time automatically.",
  },
  {
    key: "checkin_autocheckin_915" as const,
    label: "Auto check-in before 9:15 AM",
    description: "Arrivals on or before 9:15 AM skip the confirmation popup and are marked On-time or Late automatically.",
  },
  {
    key: "qr_auto_open_scanner" as const,
    label: "QR check-in — auto-open camera after selecting a session",
    description: "The camera scanner opens automatically once a session is selected, instead of waiting for Scan QR Code to be clicked.",
  },
];

export function CheckInSettingsButton({ flags }: { flags: Record<string, boolean> }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Check-in settings"
        aria-label="Check-in settings"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition text-sm font-medium"
      >
        <GearIcon />
        Settings
      </button>

      {open && (
        <div className="absolute z-50 top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Check-in Settings</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {CHECKIN_SETTINGS.map((setting) => {
              const enabled = flags[setting.key] ?? (setting.key === "checkin_confirm_popup");
              return (
                <li key={setting.key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{setting.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{setting.description}</p>
                  </div>
                  <form action={setCheckinFlag.bind(null, setting.key, !enabled)}>
                    <button
                      type="submit"
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        enabled ? "bg-[#00428E]" : "bg-gray-200"
                      }`}
                      aria-label={enabled ? "Disable" : "Enable"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                          enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
