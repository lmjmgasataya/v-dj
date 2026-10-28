"use client";

import { useState } from "react";
import Link from "next/link";
import type { AutoJourneyLink } from "@/lib/djPortalJourney";

type ResultFilter = "all" | "auto" | "already";

const STEP_PILL: Record<string, string> = {
  "Spiritual Foundations": "bg-purple-100 text-purple-700",
  "Empowering Leaders": "bg-amber-100 text-amber-700",
};

function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${
            value === o.value ? "bg-[#00428E] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {o.label} <span className="opacity-70">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

export function AutoJourneyLinksTable({ links, steps }: { links: AutoJourneyLink[]; steps: readonly string[] }) {
  const [step, setStep] = useState<string>("all");
  const [result, setResult] = useState<ResultFilter>("all");

  // Counts on each filter follow the other filter, so the numbers always match what's shown.
  const inStep = step === "all" ? links : links.filter((l) => l.step === step);
  const inResult = links.filter((l) =>
    result === "all" ? true : result === "auto" ? !l.wasAlreadyChecked : l.wasAlreadyChecked
  );
  const shown = inStep.filter((l) => inResult.includes(l));

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 border-b border-gray-100">
        <FilterPills
          value={step}
          onChange={setStep}
          options={[
            { value: "all", label: "All steps", count: inResult.length },
            ...steps.map((s) => ({ value: s, label: s, count: inResult.filter((l) => l.step === s).length })),
          ]}
        />
        <FilterPills
          value={result}
          onChange={setResult}
          options={[
            { value: "all", label: "Any result", count: inStep.length },
            { value: "auto", label: "Checked automatically", count: inStep.filter((l) => !l.wasAlreadyChecked).length },
            { value: "already", label: "Already checked", count: inStep.filter((l) => l.wasAlreadyChecked).length },
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Step</th>
              <th className="px-4 py-2 text-left font-medium">From</th>
              <th className="px-4 py-2 text-left font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((l) => (
              <tr key={`${l.vgLeaderId}-${l.step}`} className="hover:bg-gray-50 align-top">
                <td className="px-4 py-2">
                  <Link
                    href={`/vg-leader-portal/leaders/${l.vgLeaderId}`}
                    className="font-medium text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap"
                  >
                    {l.leaderName}
                  </Link>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{l.service || "Not Set"}</p>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STEP_PILL[l.step] ?? "bg-gray-100 text-gray-600"}`}>
                    {l.step}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  <span className="whitespace-nowrap">{l.source}</span>
                  {l.participantName && <p className="text-xs text-gray-400">as participant {l.participantName}</p>}
                </td>
                <td className="px-4 py-2">
                  {l.wasAlreadyChecked ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                      Already checked
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                      Auto
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">
                    {new Date(l.linkedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-6 py-4 text-sm text-gray-500">No matches for these filters.</p>}
      </div>
    </>
  );
}
