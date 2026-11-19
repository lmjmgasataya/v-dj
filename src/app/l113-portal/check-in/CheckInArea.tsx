"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { CheckInStatus } from "@/db/schema";
import { checkInStatusBadgeClass } from "@/lib/checkinStatus";
import { L113_QR_PREFIX, L113_STATUS_LABEL, l113CheckInStatus, parseL113Qr } from "@/lib/l113";
import { matchesNameQuery } from "@/lib/vgLeaderSearch";
import { useToast } from "@/components/toast/ToastProvider";
import { CheckInStatusPicker } from "@/app/admin/CheckInStatusPicker";
import { CheckInSuccessModal } from "@/app/admin/CheckInSuccessModal";
import { checkInL113Student, removeL113CheckIn, type L113CheckInMethod } from "./actions";
import { L113QrScanner } from "./L113QrScanner";

export interface CheckInStudent {
  vgLeaderId: number;
  lastName: string;
  firstName: string;
  nickname: string | null;
  service: string | null;
  /** time: "8:52 AM" when checked in on the class date itself, else null (a manual entry). */
  checkIn: { status: CheckInStatus; time: string | null; at: string } | null;
}

export interface ClassDateOption {
  id: number;
  topic: string;
  teacher: string;
  /** "Sat, Nov 22, 2026" */
  dateLabel: string;
}

type Phase = "today" | "past" | "future";

function optionLabel(o: ClassDateOption) {
  return `${o.topic} — ${o.dateLabel} · ${o.teacher}`;
}

function StepBadge({ n }: { n: number }) {
  return <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">{n}</span>;
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
    // no audio
  }
}

/** Step 1: topic dropdown (same look as /admin's session picker); the choice lives in the URL. */
function TopicSelect({ batchId, options, selectedId }: { batchId: number; options: ClassDateOption[]; selectedId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === selectedId);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left"
      >
        <span className="text-gray-900">{selected ? optionLabel(selected) : "-- Select a topic --"}</span>
        <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((o) => (
            <li
              key={o.id}
              onClick={() => {
                setOpen(false);
                if (o.id !== selectedId) router.push(`${pathname}?batch=${batchId}&date=${o.id}`);
              }}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 ${
                o.id === selectedId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-900"
              }`}
            >
              {optionLabel(o)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Attendees (n)" button + modal: who checked in, in check-in order. */
function AttendeesModal({ topic, students, phase }: { topic: string; students: CheckInStudent[]; phase: Phase }) {
  const [open, setOpen] = useState(false);
  const attended = students
    .filter((s) => s.checkIn && s.checkIn.status !== "Absent")
    .sort((a, b) => a.checkIn!.at.localeCompare(b.checkIn!.at));
  const absent = students.filter((s) => (s.checkIn ? s.checkIn.status === "Absent" : phase === "past"));
  const notYet = phase === "past" ? [] : students.filter((s) => !s.checkIn);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition shrink-0"
      >
        Attendees ({attended.length})
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Attendees</h3>
                <p className="text-sm text-gray-500">{topic}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {attended.length} attended · {absent.length} absent{notYet.length ? ` · ${notYet.length} not yet` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              {attended.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">No one has checked in yet.</p>
              ) : (
                <ol className="divide-y divide-gray-100">
                  {attended.map((s, i) => (
                    <li key={s.vgLeaderId} className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm">
                      <span className="text-gray-800">
                        <span className="text-gray-400 tabular-nums mr-2">{i + 1}.</span>
                        {s.lastName}, {s.firstName}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {s.checkIn!.time && <span className="text-xs text-gray-400">{s.checkIn!.time}</span>}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${checkInStatusBadgeClass(s.checkIn!.status)}`}>
                          {L113_STATUS_LABEL[s.checkIn!.status]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {absent.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Absent</p>
                  <p className="text-sm text-gray-600">{absent.map((s) => `${s.lastName}, ${s.firstName}`).join(" · ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface Confirming {
  student: CheckInStudent;
  method: L113CheckInMethod;
}

export function CheckInArea({
  batchId,
  batchName,
  options,
  selectedId,
  phase,
  students,
}: {
  batchId: number;
  batchName: string;
  options: ClassDateOption[];
  selectedId: number;
  phase: Phase;
  students: CheckInStudent[];
}) {
  const selected = options.find((o) => o.id === selectedId)!;
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [status, setStatus] = useState<CheckInStatus>("On-time");
  const [success, setSuccess] = useState<{ firstName: string; lastName: string; status: CheckInStatus; alreadyCheckedIn: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const counts = { "On-time": 0, Late: 0, Absent: 0, notYet: 0 };
  for (const s of students) {
    if (s.checkIn) counts[s.checkIn.status]++;
    else if (phase === "past") counts.Absent++;
    else counts.notYet++;
  }
  const checkedIn = students.filter((s) => s.checkIn && s.checkIn.status !== "Absent").length;

  function openConfirm(student: CheckInStudent, method: L113CheckInMethod) {
    // Today: pre-set by the clock (the admin can still change it). Past: they pick.
    setStatus(phase === "today" ? l113CheckInStatus(new Date()) : "On-time");
    setConfirming({ student, method });
  }

  function handleCode(text: string, method: L113CheckInMethod) {
    const id = parseL113Qr(text.trim());
    if (id == null) return toast.show("Not an L113 student QR code.", "error");
    const student = students.find((s) => s.vgLeaderId === id);
    if (!student) return toast.show(`That QR code isn't a student of ${batchName}.`, "error");
    if (student.checkIn) {
      setSuccess({ firstName: student.firstName, lastName: student.lastName, status: student.checkIn.status, alreadyCheckedIn: true });
      return;
    }
    openConfirm(student, method);
  }

  const onReaderCode = useEffectEvent((code: string) => {
    setSuccess(null);
    handleCode(code, "QR Reader");
  });

  // USB (keyboard-wedge) QR reader: it "types" dj:vgl:<id> + Enter wherever focus is. Only
  // keystrokes building up to that prefix are taken, and never while a field is focused
  // (the search box handles a typed code itself).
  useEffect(() => {
    if (phase !== "today" || confirming) return;
    let buffer = "";
    let lastTime = 0;
    const matches = (s: string) =>
      s.length <= L113_QR_PREFIX.length ? L113_QR_PREFIX.startsWith(s) : s.startsWith(L113_QR_PREFIX) && /^\d+$/.test(s.slice(L113_QR_PREFIX.length));

    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
      const now = Date.now();
      if (now - lastTime > 300) buffer = "";
      lastTime = now;
      if (e.key === "Enter") {
        const candidate = buffer;
        buffer = "";
        if (candidate.length > L113_QR_PREFIX.length && matches(candidate)) {
          e.preventDefault();
          onReaderCode(candidate);
        }
        return;
      }
      if (e.key.length !== 1) return;
      const next = buffer + e.key;
      if (matches(next)) {
        buffer = next;
        e.preventDefault();
      } else buffer = "";
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, confirming]);

  function confirm() {
    if (!confirming) return;
    const { student, method } = confirming;
    startTransition(async () => {
      const r = await checkInL113Student(selectedId, student.vgLeaderId, method, status);
      setConfirming(null);
      if (!r.ok) return toast.show(r.error, "error");
      setQ("");
      playSuccessSound();
      setSuccess({ firstName: r.firstName, lastName: r.lastName, status: r.status, alreadyCheckedIn: r.alreadyCheckedIn });
    });
  }

  function undo(s: CheckInStudent) {
    if (!window.confirm(`Remove check-in of ${s.lastName}, ${s.firstName} for "${selected.topic}"?`)) return;
    startTransition(async () => {
      const r = await removeL113CheckIn(selectedId, s.vgLeaderId);
      if (!r.ok) toast.show(r.error, "error");
    });
  }

  const typedCode = q.trim().startsWith("dj:");
  const shown = typedCode ? [] : students.filter((s) => matchesNameQuery(s, q));

  return (
    <>
      {/* Step 1: Select topic */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StepBadge n={1} />
            <p className="text-sm font-semibold text-gray-700">
              Select a Topic <span className="font-normal text-gray-400">({batchName})</span>
            </p>
          </div>
          <AttendeesModal topic={optionLabel(selected)} students={students} phase={phase} />
        </div>
        <TopicSelect batchId={batchId} options={options} selectedId={selectedId} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-green-700">
            <b className="text-sm">{counts["On-time"]}</b> On Time
          </span>
          <span className="text-orange-600">
            <b className="text-sm">{counts.Late}</b> Late
          </span>
          <span className="text-red-600">
            <b className="text-sm">{counts.Absent}</b> Absent
          </span>
          {phase !== "past" && (
            <span className="text-gray-500">
              <b className="text-sm">{counts.notYet}</b> Not yet
            </span>
          )}
        </div>
      </div>

      {/* Step 2: Scan / search student */}
      <div id="search-student" className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StepBadge n={2} />
            <p className="text-sm font-semibold text-gray-700">
              Check In Student — <span className="text-indigo-600 font-medium">{selected.topic}</span>
            </p>
          </div>
          <Link href={`/l113-portal/qr-codes?batch=${batchId}`} className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0">
            Student QR codes
          </Link>
        </div>

        {phase === "future" && (
          <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            This class is on {selected.dateLabel}. Check-in opens on the class date.
          </p>
        )}
        {phase === "past" && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This class was on {selected.dateLabel}. Students with no check-in are Absent. Use Check In to record someone&apos;s
            attendance by hand.
          </p>
        )}
        {phase === "today" && (
          <>
            <p className="text-xs text-gray-500">On Time: on or before 9:00 AM · Late: until 9:10 AM · Absent: after 9:10 AM, or no check-in by the end of the day.</p>
            <L113QrScanner onScan={(text) => handleCode(text, "Webcam")} />
            <div className="relative flex items-center my-1">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-3 text-xs text-gray-400">or search manually</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
          </>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // A USB QR reader typing into the box sends the code + Enter.
            if (typedCode && phase === "today") {
              handleCode(q, "QR Reader");
              setQ("");
            } else if (shown.length === 1 && !shown[0].checkIn && phase !== "future") {
              openConfirm(shown[0], "Search");
            }
          }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student by name..."
            className="w-full sm:flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-xs text-gray-500 shrink-0">
            {checkedIn} / {students.length} students checked in
          </span>
        </form>

        {shown.length === 0 ? (
          <p className="text-sm text-gray-400">{typedCode ? "Press Enter to check in this QR code." : `No student matches "${q}".`}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
            {shown.map((s) => {
              const subtitle = [s.nickname && `"${s.nickname}"`, s.service].filter(Boolean).join(" · ");
              return (
                <li key={s.vgLeaderId} className={`flex items-center justify-between gap-3 px-4 py-3 ${s.checkIn && s.checkIn.status !== "Absent" ? "bg-green-50" : "bg-white"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {s.lastName}, {s.firstName}
                    </p>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                  </div>
                  {s.checkIn ? (
                    <div className="flex items-center gap-3 shrink-0">
                      {s.checkIn.time && <span className="text-xs text-gray-400">{s.checkIn.time}</span>}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${checkInStatusBadgeClass(s.checkIn.status)}`}>
                        {L113_STATUS_LABEL[s.checkIn.status]}
                      </span>
                      <button onClick={() => undo(s)} disabled={pending} className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50">
                        Undo
                      </button>
                    </div>
                  ) : phase === "future" ? (
                    <span className="text-xs text-gray-400 shrink-0">—</span>
                  ) : (
                    <div className="flex items-center gap-3 shrink-0">
                      {phase === "past" && <span className="text-xs text-red-500">No check-in (Absent)</span>}
                      <button
                        onClick={() => openConfirm(s, "Search")}
                        disabled={pending}
                        className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                      >
                        Check In
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Check In</h3>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {confirming.student.lastName}, {confirming.student.firstName}
              </p>
              <p className="text-sm text-gray-500">
                {selected.topic} — {selected.dateLabel}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <CheckInStatusPicker value={status} onChange={setStatus} />
              {phase === "today" && <p className="text-xs text-gray-400">Set by the time now. Change it only if needed.</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {pending ? "Checking in..." : "Confirm Check In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <CheckInSuccessModal
          firstName={success.firstName}
          lastName={success.lastName}
          tableNumber={null}
          showTable={false}
          status={success.status}
          alreadyCheckedIn={success.alreadyCheckedIn}
          onDismiss={() => setSuccess(null)}
        />
      )}
    </>
  );
}
