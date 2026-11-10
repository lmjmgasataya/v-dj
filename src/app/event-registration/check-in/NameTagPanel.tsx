"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  LABEL_SIZE,
  nameTagHtml,
  nametagName,
  printNameTag,
  type NameTagData,
  type NameTagPerson,
} from "@/lib/nametag";

const SAMPLE_PERSON: NameTagPerson = { name: "Juan", fullName: "Juan Dela Cruz" };

// Remembered per device: only the laptop with the label printer should auto-print.
const AUTO_PRINT_KEY = "event-nametag-autoprint";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readAutoPrint(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAutoPrint(on: boolean) {
  try {
    localStorage.setItem(AUTO_PRINT_KEY, on ? "1" : "0");
  } catch {
    // storage blocked — the setting just won't stick
  }
  listeners.forEach((l) => l());
}

export function useAutoPrint(): [boolean, (on: boolean) => void] {
  const autoPrint = useSyncExternalStore(subscribe, readAutoPrint, () => false);
  return [autoPrint, writeAutoPrint];
}

const PX_PER_MM = 96 / 25.4;

/** The tag from the same markup that gets printed, scaled to fill the width of its container. */
export function NameTagPreview(tag: NameTagData) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / (LABEL_SIZE.widthMm * PX_PER_MM));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative w-full rounded-md shadow-sm ring-1 ring-gray-300 overflow-hidden bg-white"
      style={{ aspectRatio: `${LABEL_SIZE.widthMm} / ${LABEL_SIZE.heightMm}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: nameTagHtml(tag) }}
      />
    </div>
  );
}

export function NameTagPanel({
  eventName,
  eventDate,
  autoPrint,
  onAutoPrintChange,
  lastTag,
}: {
  eventName: string;
  eventDate: string;
  autoPrint: boolean;
  onAutoPrintChange: (on: boolean) => void;
  /** Name tag of the most recent check-in, shown in the preview until the user types a name. */
  lastTag: NameTagPerson | null;
}) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState("");
  const typed = sample.trim();
  const preview: NameTagData = {
    eventName,
    eventDate,
    ...(typed ? { name: nametagName({ firstName: typed }), fullName: typed } : (lastTag ?? SAMPLE_PERSON)),
  };
  const sizeLabel = `${LABEL_SIZE.widthMm} × ${LABEL_SIZE.heightMm} mm`;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#00428E]"
        >
          <span className={`inline-block transition ${open ? "rotate-90" : ""}`}>▸</span>
          Name tags <span className="font-normal text-gray-400">· {sizeLabel}</span>
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Auto-print on check-in
          <button
            type="button"
            role="switch"
            aria-checked={autoPrint}
            aria-label="Auto-print name tag on check-in"
            onClick={() => onAutoPrintChange(!autoPrint)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              autoPrint ? "bg-[#00428E]" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                autoPrint ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <NameTagPreview {...preview} />
            <p className="mt-1 text-xs text-gray-400">Preview, enlarged · prints at {sizeLabel}</p>
          </div>
          <div className="flex flex-col gap-3 text-sm min-w-0">
            <div>
              <label htmlFor="nametag-sample" className="block text-sm font-medium text-gray-700 mb-1">
                Preview a full name
              </label>
              <input
                id="nametag-sample"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                maxLength={40}
                placeholder={(lastTag ?? SAMPLE_PERSON).fullName}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => printNameTag(preview)}
              className="self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Test print
            </button>
            <p className="text-xs text-gray-500 leading-relaxed">
              Prints a {sizeLabel} tag: the event name and date, then the nickname big (or the first word of the
              first name if there&apos;s none) with the full name under it. Auto-print is saved on this device only —
              turn it on just on the laptop connected to the label printer. To print without the print dialog, start
              Chrome with <code className="rounded bg-gray-100 px-1">--kiosk-printing</code> and set the label printer
              as the default printer, with the same paper size and no margins.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function PrintTagButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#00428E]/30 bg-white px-2.5 py-1 text-xs font-semibold text-[#00428E] transition hover:bg-[#00428E] hover:text-white shrink-0"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Print tag
    </button>
  );
}
