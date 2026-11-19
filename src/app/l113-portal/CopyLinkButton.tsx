"use client";

import { useState } from "react";

/** Copies `${origin}${path}` — the link students open to encode directly. */
export function CopyLinkButton({ path, label = "Copy student link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? "✓ Copied" : `🔗 ${label}`}
    </button>
  );
}
