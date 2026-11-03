"use client";

import { useEffect } from "react";

/**
 * Bottom sheet on phones, centered dialog from `sm` up. Focus is deliberately
 * left where it was: a hardware QR scanner "types" into the focused search box
 * while a sheet is open, and that flow has to keep working.
 */
export function Sheet({
  labelledBy,
  onClose,
  dismissOnBackdrop = false,
  wide = false,
  children,
}: {
  labelledBy: string;
  onClose?: () => void;
  dismissOnBackdrop?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 sm:items-center sm:p-4"
      onClick={(e) => {
        if (dismissOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`animate-sheet-in flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.18)] sm:rounded-2xl sm:shadow-[0_16px_48px_rgba(15,23,42,0.22)] ${
          wide ? "sm:max-w-lg" : "sm:max-w-sm"
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-300 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

/** Scrollable body with the sheet's standard padding, clearing the phone's home indicator. */
export function SheetBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 ${className}`}>
      {children}
    </div>
  );
}
