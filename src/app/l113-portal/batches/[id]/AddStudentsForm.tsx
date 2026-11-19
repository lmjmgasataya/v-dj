"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { matchesNameQuery } from "@/lib/vgLeaderSearch";
import { addL113Students } from "../actions";

export interface AddableStudent {
  id: number;
  lastName: string;
  firstName: string;
  nickname: string | null;
  service: string;
  empoweringLeaders: boolean;
  /** Another L113 batch they're already a student of. */
  otherBatch: string | null;
}

export function AddStudentsForm({ batchId, candidates }: { batchId: number; candidates: AddableStudent[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const visible = useMemo(() => candidates.filter((c) => matchesNameQuery(c, query)), [candidates, query]);
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of visible) {
        if (allVisibleSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  if (candidates.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-500">Every potential L113 student is already in this batch.</p>;
  }

  return (
    <form action={addL113Students} className="flex flex-col">
      <input type="hidden" name="batchId" value={batchId} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="vgLeaderId" value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-100">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name…"
          className="flex-1 min-w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button type="button" onClick={toggleAllVisible} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
          {allVisibleSelected ? "Unselect shown" : "Select shown"}
        </button>
        <SubmitButton
          label={`Add ${selected.size || ""} selected`.replace("  ", " ")}
          pendingLabel="Adding…"
          className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
        />
      </div>
      <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
        {visible.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-3 px-6 py-2.5 text-sm cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="rounded" />
              <span className="flex-1 text-gray-800">
                {c.lastName}, {c.firstName}
                {c.nickname && <span className="text-gray-400"> ({c.nickname})</span>}
              </span>
              {c.otherBatch && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In {c.otherBatch}</span>
              )}
              {c.empoweringLeaders && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Empowering Leaders</span>
              )}
              <span className="text-xs text-gray-400 w-28 text-right">{c.service}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="px-6 py-4 text-sm text-gray-400">No match.</li>}
      </ul>
    </form>
  );
}
