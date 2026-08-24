"use client";

import { useConnectionQuality, type ConnectionQuality } from "@/lib/useConnectionQuality";

const CONFIG: Record<ConnectionQuality, { label: string; dot: string; text: string }> = {
  strong: { label: "Strong", dot: "bg-green-500", text: "text-gray-500" },
  unstable: { label: "Unstable", dot: "bg-amber-500 animate-pulse", text: "text-amber-700" },
  offline: { label: "Offline", dot: "bg-red-500", text: "text-red-700" },
};

export function ConnectionStatus() {
  const quality = useConnectionQuality(true);
  const { label, dot, text } = CONFIG[quality];

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
