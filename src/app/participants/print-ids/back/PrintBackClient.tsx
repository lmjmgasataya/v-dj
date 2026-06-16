"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";

const SESSIONS = [
  { label: "Spiritual Foundations", day: "Day 1 (Victory Day)", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 2", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 3", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 4", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 5", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 6", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 7", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 8", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 9", color: "purple" },
  { label: "Spiritual Foundations", day: "Day 10", color: "purple" },
  { label: "Making Disciples", day: "Day 1", color: "green" },
  { label: "Making Disciples", day: "Day 2", color: "green" },
] as const;

export function PrintBackClient({ count }: { count: number }) {
  const sheets = Math.max(1, Math.ceil(count / 4));

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
          .back-preview { display: none !important; }
          .back-grid {
            display: grid !important;
            grid-template-columns: 102mm 102mm !important;
            gap: 0 !important;
            width: 204mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .back-card {
            width: 102mm !important;
            height: 145.5mm !important;
            min-height: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: 0.5pt solid #e5e7eb !important;
          }
          .session-box {
            break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="print-hidden flex flex-col gap-4 mb-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Participants", href: "/participants" },
            { label: "Print IDs", href: "/participants/print-ids" },
            { label: "Back Page" },
          ]}
        />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Print ID Backs</h2>
            <p className="text-sm text-gray-500 mt-1">
              {count} participant{count !== 1 ? "s" : ""} · {sheets} sheet{sheets !== 1 ? "s" : ""} · 4 per A4 page
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Print
          </button>
        </div>
      </div>

      {/* Screen: single preview card */}
      <div className="back-preview pt-6 max-w-lg">
        <BackCard />
      </div>

      {/* Print only: full set of cards */}
      <div className="back-grid hidden">
        {Array.from({ length: sheets * 4 }).map((_, i) => (
          <BackCard key={i} />
        ))}
      </div>
    </>
  );
}

function BackCard() {
  return (
    <div className="back-card flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white min-h-[560px]">
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-6 border-gray-100">
        <img src="/dj-logo.png" alt="" className="h-20 w-auto object-contain" />
        <p className="text-right text-s font-normal uppercase tracking-widest text-gray-800 leading-tight">
          DISCIPLESHIP<br />JOURNEY<br />CLASSES
        </p>
      </div>

      {/* 12 session boxes in 3×4 grid */}
      <div className="flex-1 grid grid-cols-3 gap-3 bg-white py-5 px-7">
        {SESSIONS.map((s, i) => (
          <div key={i} className="session-box flex flex-col bg-white border-2 border-gray-700 rounded overflow-hidden">
            <div className={`px-1 py-1 text-center ${s.color === "purple" ? "bg-[#6B21A8]" : "bg-[#166534]"}`}>
              <p className="text-white font-bold leading-tight" style={{ fontSize: "8px" }}>{s.label}</p>
              <p className="text-white leading-tight" style={{ fontSize: "7px" }}>{s.day}</p>
            </div>
            <div className="flex-1 min-h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
