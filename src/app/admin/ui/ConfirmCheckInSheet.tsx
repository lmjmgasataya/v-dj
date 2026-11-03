"use client";

import { useId } from "react";
import type { CheckInStatus } from "@/db/schema";
import { Sheet, SheetBody } from "./Sheet";
import { AlertIcon, CloudUploadIcon, Spinner } from "./icons";

const STATUS_OPTIONS: { value: CheckInStatus; selected: string }[] = [
  { value: "On-time", selected: "bg-white text-green-800 shadow-sm ring-1 ring-green-600/30" },
  { value: "Late", selected: "bg-white text-amber-800 shadow-sm ring-1 ring-amber-600/35" },
  { value: "Absent", selected: "bg-white text-red-800 shadow-sm ring-1 ring-red-600/30" },
];

export function StatusSegmented({ value, onChange }: { value: CheckInStatus; onChange: (s: CheckInStatus) => void }) {
  return (
    <div role="radiogroup" aria-label="Status" className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
      {STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E] ${
              active ? opt.selected : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "warn" | "offline"; children: React.ReactNode }) {
  const cls = tone === "warn" ? "bg-amber-50 text-amber-900 ring-amber-600/25" : "bg-slate-100 text-slate-800 ring-slate-500/20";
  return (
    <div className={`flex gap-2.5 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset ${cls}`}>
      {tone === "warn" ? <AlertIcon className="mt-0.5 size-4 text-amber-700" /> : <CloudUploadIcon className="mt-0.5 size-4 text-slate-600" />}
      <p>{children}</p>
    </div>
  );
}

/** Confirm a check-in: who, any reason it can't go through, status, remarks. */
export function ConfirmCheckInSheet({
  name,
  detail,
  offline = false,
  restriction,
  status,
  onStatusChange,
  remarks,
  onRemarksChange,
  remarksPlaceholder = "e.g. arrived late, missed first 30 minutes",
  pending = false,
  onCancel,
  onConfirm,
}: {
  name: string;
  detail?: string;
  offline?: boolean;
  restriction?: string | null;
  status: CheckInStatus;
  onStatusChange: (s: CheckInStatus) => void;
  remarks: string;
  onRemarksChange: (r: string) => void;
  remarksPlaceholder?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const remarksId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={pending ? undefined : onCancel}>
      <SheetBody className="flex flex-col gap-4">
        <div>
          <h3 id={titleId} className="text-xl font-semibold text-balance text-gray-900 capitalize">
            {name}
          </h3>
          {detail && <p className="mt-0.5 text-sm text-gray-600">{detail}</p>}
        </div>

        {offline && <Notice tone="offline">You&rsquo;re offline. This check-in will be saved on this phone and synced later.</Notice>}
        {restriction && <Notice tone="warn">{restriction}</Notice>}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <StatusSegmented value={status} onChange={onStatusChange} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={remarksId} className="text-sm font-medium text-gray-700">
            Remarks <span className="font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id={remarksId}
            rows={2}
            placeholder={remarksPlaceholder}
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-500 focus:border-[#00428E] focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 sm:text-sm"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-12 rounded-xl px-5 text-base font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E] disabled:opacity-50 sm:h-10 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !!restriction}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00428E] px-6 text-base font-semibold text-white hover:bg-[#003578] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm"
          >
            {pending && <Spinner className="size-4" />}
            {pending ? "Checking in…" : "Check in"}
          </button>
        </div>
      </SheetBody>
    </Sheet>
  );
}
