"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { lookupParticipantForQr, checkInByQr } from "./actions";
import { FEE_CATEGORIES } from "@/components/form";
import { ORIENTATION_ALLOWED_CLASSES } from "@/lib/constants";
import { useToast } from "@/components/toast/ToastProvider";
import { CheckInSuccessModal } from "./CheckInSuccessModal";
import { CheckInStatusPicker } from "./CheckInStatusPicker";
import { checkInStatusForDate, isOnTimeWindow } from "@/lib/date";
import type { CheckInStatus, CheckInMethod } from "@/db/schema";

export const QR_PREFIX = "dj:participant:";
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

type Status = "idle" | "scanning" | "confirming" | "loading" | "error";

interface PendingParticipant {
  id: number;
  firstName: string;
  lastName: string;
  registrationFee: string | null;
  victoryDayBlockReason: string | null;
  method: CheckInMethod;
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

export interface CheckInResultInfo {
  lastName: string;
  message: string;
  alreadyCheckedIn: boolean;
  tableNumber: number | null;
}

export interface QrScannerHandle {
  /** Feed in an already-typed/decoded code (e.g. one that landed in another
   * focused input) and run it through the same lookup/confirm flow. */
  scan: (code: string) => void;
}

interface QrScannerProps {
  sessionId: number;
  isVictoryDay: boolean;
  allowAllClasses?: boolean;
  isOrientation?: boolean;
  autoOpen?: boolean;
  confirmBeforeCheckIn?: boolean;
  showTableNumber?: boolean;
  autoCheckin?: boolean;
  onCheckIn?: (info: CheckInResultInfo) => void;
}

export const QrScanner = forwardRef<QrScannerHandle, QrScannerProps>(function QrScanner(
  { sessionId, isVictoryDay, allowAllClasses, isOrientation, autoOpen, confirmBeforeCheckIn = true, showTableNumber = true, autoCheckin = false, onCheckIn },
  ref
) {
  const [status, setStatus] = useState<Status>(autoOpen ? "scanning" : "idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingParticipant | null>(null);
  const [remarks, setRemarks] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("On-time");
  const [mirrored, setMirrored] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ firstName: string; lastName: string; tableNumber: number | null } | null>(null);
  const toast = useToast();
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const onCheckInRef = useRef(onCheckIn);
  useEffect(() => {
    onCheckInRef.current = onCheckIn;
  });

  async function submitCheckIn(participantId: number, remarksValue: string, restingStatus: Status, statusOverride: CheckInStatus | undefined, method: CheckInMethod) {
    setStatus("loading");
    const result = await checkInByQr(participantId, sessionId, remarksValue || undefined, statusOverride, method);
    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
    } else if (result.alreadyCheckedIn) {
      const displayName = `${result.lastName}, ${result.firstName}`;
      const tableMsg = result.tableNumber ? `Table ${result.tableNumber}` : "no table assigned";
      const resultMessage = `${displayName} is already checked in — ${tableMsg}.`;
      toast.show(
        <>
          {displayName} is already checked in —{" "}
          {result.tableNumber ? <strong>Table {result.tableNumber}</strong> : "no table assigned"}.
        </>,
        "info",
        20000
      );
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: true, tableNumber: result.tableNumber });
      setStatus(restingStatus);
    } else {
      const tableMsg = result.tableNumber ? `Table ${result.tableNumber}` : "no table available";
      const resultMessage = `Checked in: ${result.lastName}, ${result.firstName} — ${tableMsg}`;
      setSuccessInfo({ firstName: result.firstName, lastName: result.lastName, tableNumber: result.tableNumber });
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: false, tableNumber: result.tableNumber });
    }
    setPending(null);
    setRemarks("");
  }

  async function processScannedCode(decodedText: string, restingStatus: Status, method: CheckInMethod) {
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
      const displayName = `${result.lastName}, ${result.firstName}`;
      const resultMessage = `${displayName} is already checked in.`;
      toast.show(
        <>
          {displayName} is already checked in —{" "}
          {result.tableNumber ? <strong>Table {result.tableNumber}</strong> : "no table assigned"}.
        </>,
        "info",
        20000
      );
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: true, tableNumber: result.tableNumber });
      setStatus(restingStatus);
    } else {
      const victoryDayRestricted = isVictoryDay && !allowAllClasses && !VICTORY_DAY_ALLOWED_CLASSES.includes(result.registrationFee ?? "");
      const orientationRestricted = !!isOrientation && !ORIENTATION_ALLOWED_CLASSES.includes(result.registrationFee ?? "");
      const restricted = victoryDayRestricted || orientationRestricted || !!result.victoryDayBlockReason;

      if (autoCheckin && !restricted && isOnTimeWindow()) {
        await submitCheckIn(participantId, "", restingStatus, "On-time", method);
      } else if (!confirmBeforeCheckIn && !restricted) {
        await submitCheckIn(participantId, "", restingStatus, undefined, method);
      } else {
        setCheckInStatus(checkInStatusForDate(new Date()));
        setPending({
          id: participantId,
          firstName: result.firstName,
          lastName: result.lastName,
          registrationFee: result.registrationFee,
          victoryDayBlockReason: result.victoryDayBlockReason,
          method,
        });
        setStatus("confirming");
      }
    }
  }

  useImperativeHandle(ref, () => ({
    scan: (code: string) => {
      void processScannedCode(code, "idle", "QR Reader");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sessionId]);

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
          {
            fps: 20,
            qrbox: { width: 250, height: 250 },
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          async (decodedText: string) => {
            if (cancelled) return;
            await scanner.stop().catch(() => {});
            scannerRef.current = null;
            await processScannedCode(decodedText, "scanning", "Webcam");
          },
          undefined
        );
        if (!cancelled) {
          try {
            const facingMode = scanner.getRunningTrackSettings().facingMode;
            setMirrored(facingMode !== "environment");
          } catch {
            setMirrored(false);
          }
          document.getElementById(CONTAINER_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => window.scrollBy({ top: window.innerWidth < 768 ? 550 : 350, behavior: "smooth" }), 100);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId, toast]);

  // Hardware (keyboard-wedge) scanner: these devices just "type" the decoded
  // text followed by Enter, as fast keystrokes, wherever focus happens to be.
  // Listen globally, but only intercept keystrokes that build up to our own
  // "dj:participant:<id>" prefix, and only when no real input/textarea is
  // focused — so normal typing (e.g. a name search starting with "d") is
  // never touched.
  useEffect(() => {
    if (status === "confirming" || status === "loading") return;

    let buffer = "";
    let lastTime = 0;

    function matchesPrefix(s: string): boolean {
      if (s.length <= QR_PREFIX.length) return QR_PREFIX.startsWith(s);
      return s.startsWith(QR_PREFIX) && /^\d+$/.test(s.slice(QR_PREFIX.length));
    }

    function isTypingInField(): boolean {
      const active = document.activeElement;
      if (!active || active === document.body) return false;
      const tag = active.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || active.getAttribute("contenteditable") === "true";
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingInField()) return;

      const now = Date.now();
      if (now - lastTime > 300) buffer = "";
      lastTime = now;

      if (e.key === "Enter") {
        const candidate = buffer;
        buffer = "";
        if (candidate.length > QR_PREFIX.length && matchesPrefix(candidate)) {
          e.preventDefault();
          void processScannedCode(candidate, status, "QR Reader");
        }
        return;
      }

      if (e.key.length !== 1) return;

      const next = buffer + e.key;
      if (matchesPrefix(next)) {
        buffer = next;
        e.preventDefault();
      } else {
        buffer = "";
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId, toast]);

  async function handleConfirm() {
    if (!pending) return;
    if (isVictoryDay && !allowAllClasses && !VICTORY_DAY_ALLOWED_CLASSES.includes(pending.registrationFee ?? "")) return;
    if (isOrientation && !ORIENTATION_ALLOWED_CLASSES.includes(pending.registrationFee ?? "")) return;
    if (pending.victoryDayBlockReason) return;
    await submitCheckIn(pending.id, remarks, "scanning", checkInStatus, pending.method);
  }

  function handleDismissSuccess() {
    setSuccessInfo(null);
    setStatus("scanning");
  }

  function handleCancel() {
    setPending(null);
    setRemarks("");
    setStatus(autoOpen ? "scanning" : "idle");
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
          className={
            status === "scanning"
              ? `overflow-hidden rounded-lg ${mirrored ? "[&_video]:-scale-x-100" : ""}`
              : "hidden"
          }
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
        const victoryDayRestricted = isVictoryDay && !allowAllClasses && !VICTORY_DAY_ALLOWED_CLASSES.includes(pending.registrationFee ?? "");
        const orientationRestricted = !!isOrientation && !ORIENTATION_ALLOWED_CLASSES.includes(pending.registrationFee ?? "");
        const restricted = victoryDayRestricted || orientationRestricted || !!pending.victoryDayBlockReason;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Check In</h3>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {pending.lastName}, {pending.firstName} — Class {classLabel(pending.registrationFee)}
              </p>
            </div>
            {restricted && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                {orientationRestricted
                  ? "Only Class A and B participants are allowed to check in for Orientation."
                  : victoryDayRestricted
                  ? "Only Class A and B participants are allowed to check in for Victory Day sessions."
                  : pending.victoryDayBlockReason}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <CheckInStatusPicker value={checkInStatus} onChange={setCheckInStatus} />
            </div>
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

      {successInfo && (
        <CheckInSuccessModal
          firstName={successInfo.firstName}
          lastName={successInfo.lastName}
          tableNumber={successInfo.tableNumber}
          showTable={showTableNumber}
          onDismiss={handleDismissSuccess}
        />
      )}
    </>
  );
});

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
