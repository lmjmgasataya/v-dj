"use client";

import { useEffect, useRef, useState } from "react";
import { checkInByQr } from "./actions";

const QR_PREFIX = "dj:participant:";
const CONTAINER_ID = "qr-scanner-container";

function parseParticipantId(text: string): number | null {
  if (!text.startsWith(QR_PREFIX)) return null;
  const n = parseInt(text.slice(QR_PREFIX.length), 10);
  return isNaN(n) ? null : n;
}

type Status = "idle" | "scanning" | "loading" | "success" | "error";

export function QrScanner({ sessionId }: { sessionId: number }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (status !== "scanning") return;

    let cancelled = false;

    async function init() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(CONTAINER_ID);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            if (cancelled) return;
            await scanner.stop().catch(() => {});
            scannerRef.current = null;

            const participantId = parseParticipantId(decodedText);
            if (!participantId) {
              setStatus("error");
              setMessage("Invalid QR code — not a participant code.");
              return;
            }

            setStatus("loading");
            const result = await checkInByQr(participantId, sessionId);

            if ("error" in result) {
              setStatus("error");
              setMessage(result.error);
            } else if (result.alreadyCheckedIn) {
              setStatus("success");
              setMessage(`${result.name} is already checked in.`);
            } else {
              setStatus("success");
              setMessage(`Checked in: ${result.name}`);
            }
          },
          undefined
        );
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Camera access denied or unavailable.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [status, sessionId]);

  function reset() {
    setStatus("idle");
    setMessage("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        id={CONTAINER_ID}
        className={status === "scanning" ? "overflow-hidden rounded-lg" : "hidden"}
      />

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
        <button
          type="button"
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 underline text-center"
        >
          Stop scanning
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
          <span className="animate-spin inline-block">⏳</span>
          Checking in...
        </div>
      )}

      {status === "success" && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-green-700">{message}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-green-600 hover:text-green-800 underline shrink-0"
          >
            Scan next
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700">{message}</p>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-red-600 hover:text-red-800 underline shrink-0"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
