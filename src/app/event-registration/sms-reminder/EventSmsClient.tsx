"use client";

import { useEffect, useState } from "react";
import { getEventAudience, type EventAudiencePerson } from "./actions";
import { normalizePhoneToE164 } from "@/lib/phone";

type EventOption = { id: number; name: string; eventDate: string; audience: ("vg_leader" | "intern")[] };
type MessageTemplate = { id: number; title: string; message: string };
type DefaultKey = { id: number; name: string; endpoint: string | null; apiKey: string } | null;
type Recipient = { id: number; name: string; phone: string };
type SendResult = Recipient & { status: "pending" | "sending" | "sent" | "failed"; error?: string };
type View = "compose" | "review" | "sending" | "done";
type Tab = "vg_leader" | "intern";

function StatusDot({ status }: { status: SendResult["status"] }) {
  if (status === "pending") return <span className="w-4 h-4 rounded-full border-2 border-gray-200 inline-block shrink-0" />;
  if (status === "sending")
    return <span className="w-4 h-4 rounded-full border-2 border-[#00428E] border-t-transparent inline-block shrink-0 animate-spin" />;
  if (status === "sent")
    return <span className="w-4 h-4 rounded-full bg-green-500 inline-flex items-center justify-center shrink-0 text-white text-[9px]">✓</span>;
  return <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center shrink-0 text-white text-[9px]">✗</span>;
}

export function EventSmsClient({
  events,
  templates,
  defaultKey,
}: {
  events: EventOption[];
  templates: MessageTemplate[];
  defaultKey: DefaultKey;
}) {
  const [view, setView] = useState<View>("compose");
  const [eventId, setEventId] = useState<number | null>(events[0]?.id ?? null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [vgLeaders, setVgLeaders] = useState<EventAudiencePerson[]>([]);
  const [interns, setInterns] = useState<EventAudiencePerson[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<SendResult[]>([]);

  const selectedEvent = events.find((e) => e.id === eventId) ?? null;

  useEffect(() => {
    if (!selectedEvent) return;
    setTab(selectedEvent.audience[0] ?? null);
    setSelected(new Set());
    getEventAudience(selectedEvent.audience).then((r) => {
      setVgLeaders(r.vgLeaders);
      setInterns(r.interns);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const pool = tab === "intern" ? interns : vgLeaders;
  const validRows = pool.filter((p) => p.mobileNumber && normalizePhoneToE164(p.mobileNumber));
  const invalidRows = pool.filter((p) => !(p.mobileNumber && normalizePhoneToE164(p.mobileNumber)));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === validRows.length && validRows.length > 0) setSelected(new Set());
    else setSelected(new Set(validRows.map((p) => p.id)));
  }

  const recipients: Recipient[] = validRows
    .filter((p) => selected.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, phone: normalizePhoneToE164(p.mobileNumber!)! }));

  const canReview = message.trim().length > 0 && recipients.length > 0;

  async function startSending() {
    const initial: SendResult[] = recipients.map((r) => ({ ...r, status: "pending" }));
    setResults(initial);
    setView("sending");

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const personalizedMessage = message.replace(/\{name\}/gi, r.name);
      setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "sending" } : x)));
      try {
        const res = await fetch("/api/sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: r.phone,
            message: personalizedMessage,
            recipientName: r.name,
            ...(defaultKey?.endpoint ? { endpoint: defaultKey.endpoint } : {}),
            ...(defaultKey?.apiKey ? { authorization: defaultKey.apiKey } : {}),
          }),
        });
        const text = await res.text();
        let ok = res.ok;
        let errorMsg: string | undefined;
        try {
          const json = JSON.parse(text) as { responses?: { success: boolean; error?: { code?: string; message?: string } }[] };
          if (Array.isArray(json.responses)) {
            ok = json.responses[0]?.success === true;
            if (!ok) {
              const e = json.responses[0]?.error;
              errorMsg = e?.message ?? e?.code ?? text;
            }
          } else if (!res.ok) {
            errorMsg = text;
          }
        } catch {
          if (!res.ok) errorMsg = text;
        }
        setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: ok ? "sent" : "failed", error: errorMsg } : x)));
      } catch (e) {
        setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "failed", error: String(e) } : x)));
      }
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, Number(process.env.NEXT_PUBLIC_SMS_SEND_DELAY_MS ?? 3000)));
      }
    }

    setView("done");
  }

  const doneCount = results.filter((r) => r.status === "sent" || r.status === "failed").length;
  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const progress = results.length > 0 ? Math.round((doneCount / results.length) * 100) : 0;

  if (events.length === 0) {
    return <p className="text-sm text-gray-400">No upcoming events to send reminders for.</p>;
  }

  if (view === "sending" || view === "done") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#00428E] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-gray-600">
          {doneCount} / {results.length} sent — {sentCount} succeeded, {failedCount} failed
        </p>
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5">
              <StatusDot status={r.status} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{r.name}</p>
                {r.error && <p className="text-xs text-red-500">{r.error}</p>}
              </div>
            </li>
          ))}
        </ul>
        {view === "done" && (
          <button
            onClick={() => {
              setView("compose");
              setResults([]);
              setSelected(new Set());
            }}
            className="self-end bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
          >
            Send another
          </button>
        )}
      </div>
    );
  }

  if (view === "review") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
        <p className="text-sm font-semibold text-gray-700">Review — {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">{message}</div>
        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {recipients.map((r) => (
            <li key={r.id} className="text-sm text-gray-600">{r.name} — {r.phone}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setView("compose")}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
          >
            Back
          </button>
          <button
            onClick={startSending}
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event</label>
        <select
          value={eventId ?? ""}
          onChange={(e) => setEventId(Number(e.target.value))}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
          {selectedEvent.audience.length > 1 && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium w-fit">
              {selectedEvent.audience.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setTab(a);
                    setSelected(new Set());
                  }}
                  className={`px-4 py-2 transition ${tab === a ? "bg-[#00428E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {a === "vg_leader" ? "VG Leaders" : "Interns"}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={toggleAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              {selected.size === validRows.length && validRows.length > 0 ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-gray-400">{selected.size} of {validRows.length} selected</span>
          </div>

          <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {validRows.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.mobileNumber}</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          {invalidRows.length > 0 && (
            <details className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <summary className="cursor-pointer font-medium">{invalidRows.length} excluded — missing or invalid phone number</summary>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {invalidRows.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</label>
        {templates.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const t = templates.find((t) => String(t.id) === e.target.value);
              if (t) setMessage(t.message);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">-- Use a template --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Type your message... use {name} to personalize."
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <button
        disabled={!canReview}
        onClick={() => setView("review")}
        className="self-end bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
      >
        Review & Send
      </button>
    </div>
  );
}
