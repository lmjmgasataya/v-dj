"use client";

import { useState, useTransition } from "react";
import { updateSmsApiKeyEndpoint } from "./actions";

type ApiKey = { id: number; name: string; endpoint: string | null };

export function ApiKeyEndpointEditor({ apiKey }: { apiKey: ApiKey }) {
  const [editing, setEditing] = useState(false);
  const [endpoint, setEndpoint] = useState(apiKey.endpoint ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await updateSmsApiKeyEndpoint(apiKey.id, endpoint);
      setEditing(false);
    });
  };

  const cancel = () => {
    setEndpoint(apiKey.endpoint ?? "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <>
        Using API key:{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-mono font-semibold text-gray-600 underline decoration-dotted underline-offset-2 hover:text-[#00428E]"
        >
          {apiKey.name}
        </button>
      </>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-mono font-semibold text-gray-600">{apiKey.name}</span>
      <span className="text-gray-400">endpoint:</span>
      <input
        type="url"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
        placeholder="https://www.traccar.org/sms"
        autoFocus
        disabled={isPending}
        className="border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono text-gray-900 w-64 focus:outline-none focus:ring-2 focus:ring-[#00428E]/20 focus:border-[#00428E] disabled:opacity-50"
      />
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="text-[#00428E] font-semibold hover:underline disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={isPending}
        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
      >
        Cancel
      </button>
    </span>
  );
}
