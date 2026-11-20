"use client";

import { useEffect, useRef, useState } from "react";
import { confirmLeave, hasUnsavedChanges, setUnsavedChanges } from "@/lib/unsavedChanges";

/**
 * Wrap a form: once a field inside changes, leaving the page (closing the tab, reloading,
 * clicking a link, or a BatchPicker/ParamSelect change) asks first. Submitting the form clears it.
 */
export function UnsavedChangesGuard({
  message = "You have unsaved changes. If you leave this page, they will be lost.",
  notice = "Unsaved changes",
  children,
}: {
  message?: string;
  notice?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEdit = () => {
      setUnsavedChanges(message);
      setDirty(true);
    };
    const onSubmit = () => {
      setUnsavedChanges(null);
      setDirty(false);
    };
    el.addEventListener("input", onEdit);
    el.addEventListener("submit", onSubmit);
    return () => {
      el.removeEventListener("input", onEdit);
      el.removeEventListener("submit", onSubmit);
      setUnsavedChanges(null);
    };
  }, [message]);

  useEffect(() => {
    if (!dirty) return;
    // Closing the tab or reloading: the browser shows its own "leave site?" prompt.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    // In-app links (next/link navigates client-side, so beforeunload never fires).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || a.getAttribute("target") === "_blank" || a.hasAttribute("download")) return;
      if (!confirmLeave()) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        setDirty(false);
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <div ref={ref}>
      {dirty && (
        <div role="status" className="sticky top-0 z-20 flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800">
          <span aria-hidden>⚠</span> {notice}
        </div>
      )}
      {children}
    </div>
  );
}
