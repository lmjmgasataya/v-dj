"use client";

import { useEffect, useRef, useState } from "react";
import { lookupParticipantForQr, checkInByQr } from "./actions";
import { FEE_CATEGORIES } from "@/components/form";

const QR_PREFIX = "dj:participant:";
const CONTAINER_ID = "qr-scanner-container";
const VICTORY_DAY_ALLOWED_CLASSES = ["A", "B"];

function classLabel(registrationFee: string | null): string {
  return FEE_CATEGORIES.find((f) => f.value === registrationFee)?.value ?? registrationFee ?? "—";
}

function parseParticipantId(text: string): number | null {
  if (!text.startsWith(QR_PREFIX)) return null;
  const n = parseInt(text.slice(QR_PREFIX.length), 10);
  return isNaN(n) ? null : n;
}

type Status = "idle" | "scanning" | "confirming" | "loading" | "success" | "error";

interface PendingParticipant {
  id: number;
  name: string;
  registrationFee: string | null;
}

function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available
  }
}

export function QrScanner({ sessionId, isVictoryDay, onCheckIn }: { sessionId: number; isVictoryDay: boolean; onCheckIn?: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingParticipant | null>(null);
  const [remarks, setRemarks] = useState("");
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

            playSuccessSound();
            setStatus("loading");
            const result = await lookupParticipantForQr(participantId, sessionId);

            if ("error" in result) {
              setStatus("error");
              setMessage(result.error);
            } else if (result.alreadyCheckedIn) {
              setStatus("success");
              setMessage(`${result.name} is already checked in.`);
            } else {
              setPending({ id: participantId, name: result.name, registrationFee: result.registrationFee });
              setStatus("confirming");
            }
          },
          undefined
        );
        if (!cancelled) {
          document.getElementById(CONTAINER_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => window.scrollBy({ top: window.innerWidth < 768 ? 850 : 500, behavior: "smooth" }), 100);
        }
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

  async function handleConfirm() {
    if (!pending) return;
    if (isVictoryDay && !VICTORY_DAY_ALLOWED_CLASSES.includes(pending.registrationFee ?? "")) return;
    setStatus("loading");
    const result = await checkInByQr(pending.id, sessionId, remarks || undefined);
    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
    } else if (result.alreadyCheckedIn) {
      setStatus("success");
      setMessage(`${result.name} is already checked in.`);
    } else {
      setStatus("success");
      setMessage(`Checked in: ${result.name}`);
      onCheckIn?.();
    }
    setPending(null);
    setRemarks("");
  }

  function handleCancel() {
    setPending(null);
    setRemarks("");
    setStatus("idle");
  }

  function reset() {
    setStatus("idle");
    setMessage("");
  }

  return (
    <>
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
            Loading...
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

      {status === "confirming" && pending && (() => {
        const restricted = isVictoryDay && !VICTORY_DAY_ALLOWED_CLASSES.includes(pending.registrationFee ?? "");
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Check In</h3>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {pending.name} — Class {classLabel(pending.registrationFee)}
              </p>
            </div>
            {restricted && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                Only Class A and B participants are allowed to check in for Victory Day sessions.
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. arrived late, missed first 30 minutes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={restricted}
                className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#00428E] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                Confirm Check In
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </>
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
