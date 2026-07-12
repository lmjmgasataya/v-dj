"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function UpdateToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = searchParams.get("updated") === "1" && !dismissed;

  function dismissToast() {
    setDismissed(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    router.replace(pathname, { scroll: false });
  }

  useEffect(() => {
    if (!showToast) return;
    toastTimer.current = setTimeout(dismissToast, 15000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  if (!showToast) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
      <span>✅ <strong>Participant updated successfully.</strong></span>
      <button onClick={dismissToast} className="shrink-0 text-green-600 hover:text-green-800 font-medium">✕</button>
    </div>
  );
}
