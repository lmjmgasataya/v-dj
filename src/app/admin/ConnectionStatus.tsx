"use client";

import { useConnectionQuality, type ConnectionQuality } from "@/lib/useConnectionQuality";
import { useNewCheckinUi } from "./ui/NewCheckinUi";

const CONFIG: Record<ConnectionQuality, { label: string; dot: string; text: string }> = {
  strong: { label: "Strong", dot: "bg-green-500", text: "text-gray-500" },
  unstable: { label: "Unstable", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
  offline: { label: "Offline", dot: "bg-red-500", text: "text-red-700" },
};

export function ConnectionStatus() {
  const quality = useConnectionQuality(true);
  const { label, dot, text } = CONFIG[quality];
  const newUi = useNewCheckinUi();

  if (newUi) {
    return (
      <div
        role="status"
        title="Connection to server"
        className={`flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-inset ring-gray-300 ${quality === "strong" ? "text-gray-700" : text}`}
      >
        <span className={`inline-block size-2 rounded-full ${dot}`} aria-hidden="true" />
        {label}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium shrink-0 ${text}`}
      title="Connection to server"
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
      {label}
    </div>
  );
}
