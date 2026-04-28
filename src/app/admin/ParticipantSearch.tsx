"use client";

import { useState, useTransition } from "react";
import { searchParticipants } from "./actions";
import { SessionCheckInList } from "./SessionCheckInList";

type Results = Awaited<ReturnType<typeof searchParticipants>>;

export function ParticipantSearch({ sessionId, sessionName }: { sessionId: number; sessionName: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function runSearch(query: string) {
    setSearched(true);
    startTransition(async () => {
      const data = await searchParticipants(sessionId, query);
      setResults(data);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    runSearch(q);
  }

  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
        Step 2 — Search Participant for{" "}
        <span className="text-indigo-600 normal-case">{sessionName}</span>
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or mobile number..."
          autoFocus
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          {pending ? "Searching..." : "Search"}
        </button>
      </form>

      {searched && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500">No participants found for &ldquo;{q}&rdquo;.</p>
          ) : (
            <SessionCheckInList
              participants={results}
              sessionId={sessionId}
              onAction={() => runSearch(q)}
            />
          )}
        </div>
      )}
    </div>
  );
}
