"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { lookupParticipantForQr, checkInByQr, type CheckinRosterEntry } from "./actions";
import { FEE_CATEGORIES } from "@/components/form";
import { ORIENTATION_ALLOWED_CLASSES } from "@/lib/constants";
import { CheckInSuccessModal } from "./CheckInSuccessModal";
import { CheckInStatusPicker } from "./CheckInStatusPicker";
import { checkInStatusForDate, isOnTimeWindow, isWithinLateCutoff } from "@/lib/date";
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

// html5-qrcode's stop() throws synchronously (not a rejected promise) when the
// scanner isn't currently running/paused, so a plain `.catch()` can't guard
// it — wrap the call itself in try/catch.
async function safeStop(scanner: { stop: () => Promise<void> } | null) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // already stopped, never started, or mid-transition — nothing to do
  }
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
  autoCheckin915?: boolean;
  onCheckIn?: (info: CheckInResultInfo) => void;
  /** Preloaded session roster, keyed by participant id — lets a scan resolve
   * instantly from memory instead of round-tripping to the server. Falls
   * back to a server lookup on a cache miss (e.g. a walk-in added after the
   * roster loaded). */
  roster?: Map<number, CheckinRosterEntry>;
  onRosterUpdate?: (participantId: number, patch: Partial<CheckinRosterEntry>) => void;
}

export const QrScanner = forwardRef<QrScannerHandle, QrScannerProps>(function QrScanner(
  { sessionId, isVictoryDay, allowAllClasses, isOrientation, autoOpen, confirmBeforeCheckIn = true, showTableNumber = true, autoCheckin = false, autoCheckin915 = false, onCheckIn, roster, onRosterUpdate },
  ref
) {
  const [status, setStatus] = useState<Status>(autoOpen ? "scanning" : "idle");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<PendingParticipant | null>(null);
  const [remarks, setRemarks] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("On-time");
  const [mirrored, setMirrored] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ firstName: string; lastName: string; tableNumber: number | null; status: CheckInStatus } | null>(null);
  const [alreadyInfo, setAlreadyInfo] = useState<{ firstName: string; lastName: string; tableNumber: number | null } | null>(null);
  const [loadingLabel, setLoadingLabel] = useState("Loading…");
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const onCheckInRef = useRef(onCheckIn);
  useEffect(() => {
    onCheckInRef.current = onCheckIn;
  });

  async function submitCheckIn(participantId: number, remarksValue: string, statusOverride: CheckInStatus | undefined, method: CheckInMethod) {
    setLoadingLabel("Checking in…");
    setStatus("loading");
    const result = await checkInByQr(participantId, sessionId, remarksValue || undefined, statusOverride, method);
    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
    } else if (result.alreadyCheckedIn) {
      const displayName = `${result.lastName}, ${result.firstName}`;
      const tableMsg = result.tableNumber ? `Table ${result.tableNumber}` : "no table assigned";
      const resultMessage = `${displayName} is already checked in — ${tableMsg}.`;
      setAlreadyInfo({ firstName: result.firstName, lastName: result.lastName, tableNumber: result.tableNumber });
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: true, tableNumber: result.tableNumber });
      onRosterUpdate?.(participantId, { alreadyCheckedIn: true, tableNumber: result.tableNumber });
    } else {
      const tableMsg = result.tableNumber ? `Table ${result.tableNumber}` : "no table available";
      const resultMessage = `Checked in: ${result.lastName}, ${result.firstName} — ${tableMsg}`;
      setSuccessInfo({ firstName: result.firstName, lastName: result.lastName, tableNumber: result.tableNumber, status: statusOverride ?? checkInStatusForDate(new Date()) });
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: false, tableNumber: result.tableNumber });
      onRosterUpdate?.(participantId, { alreadyCheckedIn: true, tableNumber: result.tableNumber });
    }
    setPending(null);
    setRemarks("");
  }

  async function processScannedCode(decodedText: string, method: CheckInMethod) {
    const participantId = parseParticipantId(decodedText);
    if (!participantId) {
      setStatus("error");
      setMessage("Invalid QR code — not a participant code.");
      return;
    }

    playSuccessSound();

    const cached = roster?.get(participantId);
    let result;
    if (cached) {
      result = {
        firstName: cached.firstName,
        lastName: cached.lastName,
        alreadyCheckedIn: cached.alreadyCheckedIn,
        registrationFee: cached.registrationFee,
        victoryDayBlockReason: cached.victoryDayBlockReason,
        tableNumber: cached.tableNumber,
      };
    } else {
      setLoadingLabel("Looking up participant…");
      setStatus("loading");
      result = await lookupParticipantForQr(participantId, sessionId);
    }

    if ("error" in result) {
      setStatus("error");
      setMessage(result.error);
    } else if (result.alreadyCheckedIn) {
      const displayName = `${result.lastName}, ${result.firstName}`;
      const resultMessage = `${displayName} is already checked in.`;
      setAlreadyInfo({ firstName: result.firstName, lastName: result.lastName, tableNumber: result.tableNumber });
      onCheckInRef.current?.({ lastName: result.lastName, message: resultMessage, alreadyCheckedIn: true, tableNumber: result.tableNumber });
    } else {
      const victoryDayRestricted = isVictoryDay && !allowAllClasses && !VICTORY_DAY_ALLOWED_CLASSES.includes(result.registrationFee ?? "");
      const orientationRestricted = !!isOrientation && !ORIENTATION_ALLOWED_CLASSES.includes(result.registrationFee ?? "");
      const restricted = victoryDayRestricted || orientationRestricted || !!result.victoryDayBlockReason;

      if (autoCheckin && !restricted && isOnTimeWindow()) {
        await submitCheckIn(participantId, "", "On-time", method);
      } else if (autoCheckin915 && !restricted && isWithinLateCutoff()) {
        await submitCheckIn(participantId, "", checkInStatusForDate(new Date()), method);
      } else if (!confirmBeforeCheckIn && !restricted) {
        await submitCheckIn(participantId, "", undefined, method);
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
      void processScannedCode(code, "QR Reader");
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
            await safeStop(scanner);
            scannerRef.current = null;
            await processScannedCode(decodedText, "Webcam");
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
      void safeStop(scannerRef.current);
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, sessionId]);

  // Hardware (keyboard-wedge) scanner: these devices just "type" the decoded
  // text followed by Enter, as fast keystrokes, wherever focus happens to be.
  // Listen globally, but only intercept keystrokes that build up to our own
  // "dj:participant:<id>" prefix, and only when no real input/textarea is
  // focused — so normal typing (e.g. a name search starting with "d") is
  // never touched.
  useEffect(() => {
    if (status === "confirming" || status === "loading" || alreadyInfo || successInfo) return;

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
          void processScannedCode(candidate, "QR Reader");
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
  }, [status, sessionId, alreadyInfo, successInfo]);

  async function handleConfirm() {
    if (!pending) return;
    if (isVictoryDay && !allowAllClasses && !VICTORY_DAY_ALLOWED_CLASSES.includes(pending.registrationFee ?? "")) return;
    if (isOrientation && !ORIENTATION_ALLOWED_CLASSES.includes(pending.registrationFee ?? "")) return;
    if (pending.victoryDayBlockReason) return;
    await submitCheckIn(pending.id, remarks, checkInStatus, pending.method);
  }

  function handleDismissSuccess() {
    setSuccessInfo(null);
    setStatus(autoOpen ? "scanning" : "idle");
  }

  function handleDismissAlready() {
    setAlreadyInfo(null);
    setStatus(autoOpen ? "scanning" : "idle");
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

      {status === "loading" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8 flex flex-col items-center gap-3">
            <span className="animate-spin inline-block text-4xl">⏳</span>
            <p className="text-sm text-gray-500">{loadingLabel}</p>
          </div>
        </div>
      )}

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
          status={successInfo.status}
          showTable={showTableNumber}
          onDismiss={handleDismissSuccess}
        />
      )}

      {alreadyInfo && (
        <CheckInSuccessModal
          firstName={alreadyInfo.firstName}
          lastName={alreadyInfo.lastName}
          tableNumber={alreadyInfo.tableNumber}
          showTable={showTableNumber}
          alreadyCheckedIn
          onDismiss={handleDismissAlready}
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
