"use client";

import { useState, useMemo } from "react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toggleShowFullName } from "./actions";

type Participant = {
  id: number;
  firstName: string;
  lastName: string;
  preferredNameOnId: string | null;
  registrationFee: string | null;
  batchId: number | null;
};

type Batch = {
  id: number;
  name: string;
  classStartDate: string;
  classEndDate: string;
  isDefault: boolean;
};



export function PrintIdsClient({
  participants,
  batches,
  showFullName,
}: {
  participants: Participant[];
  batches: Batch[];
  showFullName: boolean;
}) {
  const defaultBatch = batches.find((b) => b.isDefault) ?? batches[0] ?? null;
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(defaultBatch?.id ?? null);
  const [sortBy, setSortBy] = useState<"lastName" | "registrationFee">("lastName");

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) ?? null;

  const filtered = useMemo(() => {
    const list = participants.filter((p) => p.batchId === selectedBatchId);
    return [...list].sort((a, b) => {
      if (sortBy === "registrationFee") {
        const feeCompare = (a.registrationFee ?? "").localeCompare(b.registrationFee ?? "");
        if (feeCompare !== 0) return feeCompare;
      }
      return (
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
      );
    });
  }, [participants, selectedBatchId, sortBy]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(filtered.map((p) => p.id))
  );
  const [lastBatchId, setLastBatchId] = useState(selectedBatchId);
  if (selectedBatchId !== lastBatchId) {
    setLastBatchId(selectedBatchId);
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  }

  const toPrint = useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id)),
    [filtered, selectedIds]
  );

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map((p) => p.id)));
  };

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 3mm; }
          header { display: none !important; }
          main {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hidden { display: none !important; }
          .id-grid {
            display: grid !important;
            grid-template-columns: 102mm 102mm !important;
            gap: 0 !important;
            width: 204mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-card {
            width: 102mm !important;
            height: 145.5mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 0.5pt solid #e5e7eb !important;
          }
        }
      `}</style>

      <div className="print-hidden flex flex-col gap-4 mb-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Participants", href: "/participants" },
            { label: "Print IDs" },
          ]}
        />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Print IDs</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedBatchId === null
                  ? "Select a batch to display IDs."
                  : `${toPrint.length} of ${filtered.length} selected · 4 per A4 page`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Batch</label>
              {batches.length === 0 ? (
                <span className="text-sm text-gray-400">No batches yet — create one in devops-admin.</span>
              ) : (
                <select
                  value={selectedBatchId ?? ""}
                  onChange={(e) => setSelectedBatchId(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00428E]"
                >
                  <option value="">— select —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}{b.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "lastName" | "registrationFee")}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00428E]"
              >
                <option value="lastName">Last Name (A–Z)</option>
                <option value="registrationFee">Registration Fee</option>
              </select>
            </div>
            <form action={toggleShowFullName} className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show full name</span>
              <button
                type="submit"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${showFullName ? "bg-[#00428E]" : "bg-gray-200"}`}
                aria-label={showFullName ? "Hide full name" : "Show full name"}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${showFullName ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </form>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => window.print()}
              className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Print
            </button>
            <Link href="/participants/print-ids/back" className="text-s text-indigo-600 hover:text-indigo-800 font-medium underline">
              Print Back Page →
            </Link>
          </div>
        </div>

        {selectedBatchId !== null && filtered.length > 0 && (
          <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 sticky top-0 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-[#00428E] focus:ring-[#00428E]"
              />
              {allSelected ? "Deselect all" : "Select all"}
            </label>
            <div className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="h-4 w-4 rounded border-gray-300 text-[#00428E] focus:ring-[#00428E]"
                  />
                  <span className="capitalize">{p.lastName.toLowerCase()}, {p.firstName.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="id-grid grid grid-cols-2 gap-3 pt-6">
        {selectedBatchId !== null && toPrint.map((p) => (
          <IdCard key={p.id} participant={p} showFullName={showFullName} batchName={selectedBatch?.name ?? ""} />
        ))}
        {(selectedBatchId === null || toPrint.length === 0) && (
          <p className="col-span-2 text-center text-gray-400 py-12">
            {selectedBatchId === null
              ? "Select a batch to display IDs."
              : filtered.length === 0
              ? "No participants in this batch."
              : "No participants selected."}
          </p>
        )}
      </div>
    </>
  );
}

function IdCard({ participant, showFullName, batchName }: { participant: Participant; showFullName: boolean; batchName: string }) {
  const displayName =
    participant.preferredNameOnId?.trim() ||
    `${participant.firstName} ${participant.lastName}`;
  const fullName = `${participant.firstName} ${participant.lastName}`;
  const qrValue = `dj:participant:${participant.id}`;
  const longestWordLength = Math.max(...displayName.split(/\s+/).map((w) => w.length));
  const nameFontSizeClass = longestWordLength >= 10 ? "text-5xl" : "text-6xl";

  return (
    <div className="id-card flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="flex items-center justify-between px-10 pt-8 border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dj-logo.png" alt="" className="h-28 w-auto object-contain" />
        <p className="text-right text-xl font-normal uppercase tracking-widest text-gray-800 leading-tight">
          DISCIPLESHIP<br />JOURNEY<br />CLASSES
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 min-h-48">
        <p className={`${nameFontSizeClass} font-bold text-gray-900 leading-tight text-center capitalize`} style={{ transform: "scale(1.1, 1.2)", display: "inline-block" }}>{displayName.toLowerCase()}</p>
      </div>

      <div className="px-10 pb-4">
        <div className="flex items-end justify-between">
          <p className="text-sm font-semibold text-gray-700 leading-snug">
            {batchName}<br />Discipleship Journey<br />Classes
          </p>
          <div className="p-1.5 border border-gray-100 rounded-md bg-white">
            <QRCode value={qrValue} size={130} />
          </div>
        </div>
        <p className={`text-xs text-gray-500 text-right ${showFullName ? "" : "invisible"}`}>
          <span className="capitalize">{fullName.toLowerCase()}</span>
          {participant.registrationFee ? ` (${participant.registrationFee})` : ""}
        </p>
      </div>
    </div>
  );
}
