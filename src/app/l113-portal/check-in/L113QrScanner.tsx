"use client";

import { useEffect, useRef, useState } from "react";

const CONTAINER_ID = "l113-qr-scanner";

// html5-qrcode's stop() throws synchronously when the scanner isn't running.
async function safeStop(scanner: { stop: () => Promise<void> } | null) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // already stopped
  }
}

/** Same flow as /admin's scanner: "Scan QR Code" opens the camera, one scan closes it. */
export function L113QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [mirrored, setMirrored] = useState(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (status !== "scanning") return;
    let cancelled = false;
    let scanner: (InstanceType<typeof import("html5-qrcode").Html5Qrcode>) | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const s = new Html5Qrcode(CONTAINER_ID);
        scanner = s;
        await s.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: { width: 250, height: 250 } },
          async (text: string) => {
            if (cancelled) return;
            cancelled = true;
            await safeStop(s);
            setStatus("idle");
            onScanRef.current(text);
          },
          undefined
        );
        if (cancelled) return void safeStop(s);
        try {
          setMirrored(s.getRunningTrackSettings().facingMode !== "environment");
        } catch {
          setMirrored(false);
        }
        document.getElementById(CONTAINER_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      void safeStop(scanner);
    };
  }, [status]);

  return (
    <div className="flex flex-col gap-3">
      <div id={CONTAINER_ID} className={status === "scanning" ? `overflow-hidden rounded-lg ${mirrored ? "[&_video]:-scale-x-100" : ""}` : "hidden"} />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => setStatus("scanning")}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-sm font-semibold transition"
        >
          <CameraIcon />
          Scan QR Code
        </button>
      )}

      {status === "scanning" && (
        <button type="button" onClick={() => setStatus("idle")} className="text-sm text-gray-500 hover:text-gray-700 underline text-center">
          Stop scanning
        </button>
      )}

      {status === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700">Camera access denied or unavailable.</p>
          <button type="button" onClick={() => setStatus("idle")} className="text-xs text-red-600 hover:text-red-800 underline shrink-0">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
