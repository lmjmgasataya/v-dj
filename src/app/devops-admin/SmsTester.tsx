"use client";

import { useState } from "react";

export function SmsTester() {
  const [apiKey, setApiKey] = useState("");
  const [recipient, setRecipient] = useState("+63");
  const [message, setMessage] = useState("Hello world!!");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [response, setResponse] = useState<string>("");

  const handleSend = async () => {
    setStatus("sending");
    setResponse("");
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // endpoint: "http://192.168.55.104:8082",
          endpoint: "https://www.traccar.org/sms",
          authorization: apiKey,
          to: recipient,
          message,
        }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      setStatus(res.ok ? "ok" : "error");
    } catch (err) {
      setResponse(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">SMS Tester</h3>
        <p className="text-xs text-gray-500 mt-0.5">Send a test SMS via Traccar.</p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Authorization value"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="+639XXXXXXXXX"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={status === "sending" || !apiKey || !recipient || !message}
            className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
          >
            {status === "sending" ? "Sending…" : "Send SMS"}
          </button>
          {status === "ok" && (
            <span className="text-sm font-medium text-green-600">Sent</span>
          )}
          {status === "error" && (
            <span className="text-sm font-medium text-red-600">Failed</span>
          )}
        </div>

        {response && (
          <pre className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {response}
          </pre>
        )}
      </div>
    </div>
  );
}
