"use client";

import { useEffect, useState, useTransition } from "react";
import { getVgLeaderMergeCandidates, mergeVgLeaders, type VgLeaderMergeCandidate } from "./mergeActions";

const FIELD_LABELS: [keyof VgLeaderMergeCandidate, string][] = [
  ["middleInitial", "Middle Initial"],
  ["nickname", "Nickname"],
  ["mobileNumber", "Mobile Number"],
  ["age", "Age"],
  ["gender", "Gender"],
  ["lifestage", "Lifestage"],
  ["serviceAttending", "Service Attending"],
  ["facebookMessengerName", "Facebook / Messenger"],
  ["discipleshipJourneyCompleted", "Discipleship Journey"],
  ["graduateOfLeadership113", "Graduate of L113"],
  ["ownVgLeaderName", "Own VG Leader"],
  ["startedLeadingVg", "Started Leading VG"],
];

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function isBlank(v: unknown) {
  return v === null || v === undefined || v === "";
}

function completenessScore(rec: VgLeaderMergeCandidate) {
  return FIELD_LABELS.filter(([key]) => !isBlank(rec[key])).length;
}

export function MergeVgLeadersModal({ idA, idB, onClose }: { idA: number; idB: number; onClose: () => void }) {
  const [records, setRecords] = useState<VgLeaderMergeCandidate[] | null>(null);
  const [keepId, setKeepId] = useState<number>(idA);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getVgLeaderMergeCandidates(idA, idB).then((recs) => {
      setRecords(recs);
      const a = recs.find((r) => r.id === idA);
      const b = recs.find((r) => r.id === idB);
      if (a && b) setKeepId(completenessScore(a) >= completenessScore(b) ? idA : idB);
    });
  }, [idA, idB]);

  function handleConfirm() {
    const dropId = keepId === idA ? idB : idA;
    setError(null);
    startTransition(async () => {
      const result = await mergeVgLeaders(keepId, dropId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Merge Records</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">
            ✕
          </button>
        </div>

        {!records ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Loading...</p>
        ) : records.length < 2 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">One of these records is no longer available.</p>
        ) : (
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Pick which record stays. The other&apos;s data fills in anything the kept record is missing, and
              everything linked to it (participants, victory groups, event history) is repointed before it&apos;s
              removed.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[idA, idB].map((id) => {
                const rec = records.find((r) => r.id === id)!;
                const isKeep = keepId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKeepId(id)}
                    className={`text-left rounded-lg border p-3 transition ${
                      isKeep ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {isKeep ? "Keep this one" : "Merge into the other"}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {rec.lastName}, {rec.firstName}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Field</th>
                    <th className="px-3 py-2 text-left font-medium">Kept</th>
                    <th className="px-3 py-2 text-left font-medium">Dropped</th>
                    <th className="px-3 py-2 text-left font-medium">Merged Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {FIELD_LABELS.map(([key, label]) => {
                    const keep = records.find((r) => r.id === keepId)!;
                    const drop = records.find((r) => r.id !== keepId)!;
                    const merged = isBlank(keep[key]) && !isBlank(drop[key]) ? drop[key] : keep[key];
                    return (
                      <tr key={key}>
                        <td className="px-3 py-2 text-gray-500">{label}</td>
                        <td className="px-3 py-2 text-gray-700">{displayValue(keep[key])}</td>
                        <td className="px-3 py-2 text-gray-400">{displayValue(drop[key])}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{displayValue(merged)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
              >
                {pending ? "Merging..." : "Merge"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
