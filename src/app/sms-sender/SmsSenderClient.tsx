"use client";

import { useState, useTransition } from "react";
import { getParticipantsByBatch, getDisciplersByBatch, getVGLeadersByBatch } from "./actions";
import { toTitleCase } from "@/lib/text";

type Batch = { id: number; name: string; classStartDate: string; isDefault: boolean };
type MessageTemplate = { id: number; title: string; message: string };
type PersonRow = { id: number; lastName: string; firstName: string; mobileNumber: string | null };
type Recipient = { id: number; name: string; phone: string };
type SendResult = Recipient & { status: "pending" | "sending" | "sent" | "failed"; error?: string };
type View = "compose" | "review" | "sending" | "done";
type RecipientTab = "participants" | "disciplers" | "vgleaders" | "others";

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("639")) return `+${d}`;
  if (d.length === 11 && d.startsWith("09")) return `+63${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("9")) return `+63${d}`;
  return null;
}

function SectionLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-full bg-[#00428E] text-white text-xs font-semibold flex items-center justify-center shrink-0">
        {n}
      </span>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </div>
  );
}

function StatusDot({ status }: { status: SendResult["status"] }) {
  if (status === "pending")
    return <span className="w-4 h-4 rounded-full border-2 border-gray-200 inline-block shrink-0" />;
  if (status === "sending")
    return <span className="w-4 h-4 rounded-full border-2 border-[#00428E] border-t-transparent inline-block shrink-0 animate-spin" />;
  if (status === "sent")
    return <span className="w-4 h-4 rounded-full bg-green-500 inline-flex items-center justify-center shrink-0 text-white text-[9px]">✓</span>;
  return <span className="w-4 h-4 rounded-full bg-red-500 inline-flex items-center justify-center shrink-0 text-white text-[9px]">✗</span>;
}

const TAB_LABELS: Record<RecipientTab, string> = {
  participants: "Participants",
  disciplers: "Disciplers",
  vgleaders: "VG Leaders",
  others: "Others",
};

type DefaultKey = { id: number; name: string; endpoint: string | null; apiKey: string } | null;

export function SmsSenderClient({ batches, templates, defaultKey }: { batches: Batch[]; templates: MessageTemplate[]; defaultKey: DefaultKey }) {
  const [view, setView] = useState<View>("compose");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [tab, setTab] = useState<RecipientTab>("participants");
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [othersText, setOthersText] = useState("");
  const [results, setResults] = useState<SendResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadRows = (id: number, t: RecipientTab) => {
    if (t === "others") return;
    setSelected(new Set());
    setRows([]);
    startTransition(async () => {
      const fetchers = {
        participants: () => getParticipantsByBatch(id),
        disciplers: () => getDisciplersByBatch(id),
        vgleaders: () => getVGLeadersByBatch(id),
      };
      setRows(await fetchers[t]());
    });
  };

  const handleBatchChange = (id: number) => {
    setBatchId(id);
    loadRows(id, tab);
  };

  const handleTabChange = (t: RecipientTab) => {
    setTab(t);
    if (t !== "others" && batchId) loadRows(batchId, t);
  };

  const validRows = rows.filter((p) => p.mobileNumber && normalizePhone(p.mobileNumber));

  const toggleAll = () => {
    if (selected.size === validRows.length && validRows.length > 0) setSelected(new Set());
    else setSelected(new Set(validRows.map((p) => p.id)));
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const othersLines = othersText
    .split("\n")
    .map((l, i) => ({ raw: l.trim(), i }))
    .filter(({ raw }) => raw.length > 0);

  const othersRecipients: Recipient[] = othersLines
    .filter(({ raw }) => normalizePhone(raw) !== null)
    .map(({ raw, i }) => ({ id: -(i + 1), name: raw, phone: normalizePhone(raw)! }));

  const recipients: Recipient[] =
    tab === "others"
      ? othersRecipients
      : validRows
          .filter((p) => selected.has(p.id))
          .map((p) => ({
            id: p.id,
            name: `${toTitleCase(p.lastName)}, ${toTitleCase(p.firstName)}`,
            phone: normalizePhone(p.mobileNumber!)!,
          }));

  const canReview =
    message.trim().length > 0 &&
    (tab === "others" ? othersRecipients.length > 0 : !!batchId && selected.size > 0);

  const startSending = async () => {
    const initial: SendResult[] = recipients.map((r) => ({ ...r, status: "pending" }));
    setResults(initial);
    setView("sending");

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      setResults((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "sending" } : x)));
      try {
        const res = await fetch("/api/sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: r.phone, message, ...(defaultKey?.endpoint ? { endpoint: defaultKey.endpoint } : {}), ...(defaultKey?.apiKey ? { authorization: defaultKey.apiKey } : {}) }),
        });
        const text = await res.text();
        let ok = res.ok;
        let errorMsg: string | undefined;
        try {
          const json = JSON.parse(text) as {
            successCount?: number;
            failureCount?: number;
            responses?: { success: boolean; error?: { code?: string; message?: string } }[];
          };
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
        setResults((prev) =>
          prev.map((x) =>
            x.id === r.id ? { ...x, status: ok ? "sent" : "failed", error: errorMsg } : x
          )
        );
      } catch (e) {
        setResults((prev) =>
          prev.map((x) => (x.id === r.id ? { ...x, status: "failed", error: String(e) } : x))
        );
      }
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, Number(process.env.NEXT_PUBLIC_SMS_SEND_DELAY_MS ?? 3000)));
      }
    }

    setView("done");
  };

  const doneCount = results.filter((r) => r.status === "sent" || r.status === "failed").length;
  const sentCount = results.filter((r) => r.status === "sent").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const progress = results.length > 0 ? Math.round((doneCount / results.length) * 100) : 0;

  const resendOne = async (id: number) => {
    const r = results.find((x) => x.id === id);
    if (!r) return;
    setResults((prev) => prev.map((x) => (x.id === id ? { ...x, status: "sending", error: undefined } : x)));
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: r.phone, message, ...(defaultKey?.endpoint ? { endpoint: defaultKey.endpoint } : {}), ...(defaultKey?.apiKey ? { authorization: defaultKey.apiKey } : {}) }),
      });
      const text = await res.text();
      let ok = res.ok;
      let errorMsg: string | undefined;
      try {
        const json = JSON.parse(text) as {
          responses?: { success: boolean; error?: { code?: string; message?: string } }[];
        };
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
      setResults((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: ok ? "sent" : "failed", error: errorMsg } : x))
      );
    } catch (e) {
      setResults((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "failed", error: String(e) } : x))
      );
    }
  };

  const reset = () => {
    setView("compose");
    setBatchId(null);
    setRows([]);
    setSelected(new Set());
    setOthersText("");
    setMessage("");
    setResults([]);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 flex flex-col gap-6">

        {/* Compose */}
        {view === "compose" && (
          <>
            {/* 1. Batch */}
            <div>
              <SectionLabel n={1} label="Batch" />
              <select
                value={batchId ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) handleBatchChange(val);
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 focus:border-[#00428E]"
              >
                <option value="">Select a batch…</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Recipients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00428E] text-white text-xs font-semibold flex items-center justify-center shrink-0">2</span>
                  <span className="text-sm font-semibold text-gray-700">Recipients</span>
                </div>
                {tab !== "others" && !isPending && validRows.length > 0 && (
                  <button onClick={toggleAll} className="text-xs text-[#00428E] hover:underline">
                    {selected.size === validRows.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-3">
                {(["participants", "disciplers", "vgleaders", "others"] as RecipientTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTabChange(t)}
                    className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition ${
                      tab === t
                        ? "border-[#00428E] text-[#00428E]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>

              {tab === "others" ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={othersText}
                    onChange={(e) => setOthersText(e.target.value)}
                    rows={4}
                    placeholder={"09171234567\n09181234567\n+639191234567"}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 focus:border-[#00428E]"
                  />
                  <p className="text-xs text-gray-400">One number per line.</p>
                  {othersLines.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {othersLines.map(({ raw, i }) => {
                        const phone = normalizePhone(raw);
                        return (
                          <div key={i} className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs font-mono text-gray-600">{raw}</span>
                            {phone ? (
                              <span className="text-xs font-mono text-green-600">{phone}</span>
                            ) : (
                              <span className="text-xs text-red-400">invalid</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : !batchId ? (
                <p className="text-sm text-gray-400 py-2">Select a batch first.</p>
              ) : isPending ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-4 h-4 rounded bg-gray-200 animate-pulse shrink-0" />
                      <span className="h-3 rounded bg-gray-200 animate-pulse flex-1" style={{ width: `${55 + (i * 13) % 35}%` }} />
                      <span className="h-3 w-24 rounded bg-gray-200 animate-pulse shrink-0" />
                    </div>
                  ))}
                </div>
              ) : validRows.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  No {TAB_LABELS[tab].toLowerCase()} with valid phone numbers in this batch.
                </div>
              ) : (
                <div className="overflow-y-auto max-h-64 border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {validRows.map((p) => {
                    const phone = normalizePhone(p.mobileNumber!)!;
                    const isSelected = selected.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(p.id)}
                          className="rounded border-gray-300 text-[#00428E] focus:ring-[#00428E]"
                        />
                        <span className="flex-1 text-sm text-gray-800">
                          {toTitleCase(p.lastName)}, {toTitleCase(p.firstName)}
                        </span>
                        <span className="text-xs font-mono text-gray-500">{phone}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Message */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00428E] text-white text-xs font-semibold flex items-center justify-center shrink-0">3</span>
                  <span className="text-sm font-semibold text-gray-700">Message</span>
                </div>
                <a href="/sms-sender/message-templates" className="text-xs text-[#00428E] hover:underline">
                  Manage message templates
                </a>
              </div>
              {templates.length > 0 && (
                <select
                  onChange={(e) => {
                    const t = templates.find((t) => t.id === Number(e.target.value));
                    if (t) setMessage(t.message);
                  }}
                  defaultValue=""
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 focus:border-[#00428E] mb-2"
                >
                  <option value="">Use a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                placeholder="Type your message here…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 focus:border-[#00428E]"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{message.length} characters</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setView("review")}
                disabled={!canReview}
                className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                Review →
              </button>
            </div>
          </>
        )}

        {/* Review */}
        {view === "review" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Message</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap">
                {message}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Recipients ({recipients.length})
              </p>
              <div className="overflow-y-auto max-h-64 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {recipients.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-800">{r.name}</span>
                    <span className="text-xs font-mono text-gray-500">{r.phone}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => setView("compose")} className="text-sm text-gray-500 hover:text-gray-700 transition">
                ← Back
              </button>
              <button
                onClick={startSending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Send to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}

        {/* Sending / Done */}
        {(view === "sending" || view === "done") && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {view === "done" ? "Finished" : "Sending…"}
              </p>
              <p className="text-xs text-gray-500">{doneCount} / {results.length}</p>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[#00428E] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {view === "done" && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">{sentCount} sent</span>
                {failedCount > 0 && <span className="text-red-500 font-medium">{failedCount} failed</span>}
              </div>
            )}

            <div className="overflow-y-auto max-h-72 border border-gray-200 rounded-lg divide-y divide-gray-100">
              {results.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <StatusDot status={r.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{r.name}</p>
                    {r.error && <p className="text-xs text-red-500 truncate">{r.error}</p>}
                  </div>
                  <span className="text-xs font-mono text-gray-400 shrink-0">{r.phone}</span>
                  {r.status === "failed" && (
                    <button
                      onClick={() => resendOne(r.id)}
                      title="Resend"
                      className="shrink-0 text-green-500 hover:text-green-600 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {view === "done" && (
              <div className="flex justify-end">
                <button onClick={reset} className="text-sm text-[#00428E] hover:underline">
                  Send another batch
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
