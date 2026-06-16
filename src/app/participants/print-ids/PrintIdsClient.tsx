"use client";

import QRCode from "react-qr-code";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type Participant = {
  id: number;
  firstName: string;
  lastName: string;
  preferredNameOnId: string | null;
};

export function PrintIdsClient({ participants }: { participants: Participant[] }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          header { display: none !important; }
          main {
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hidden { display: none !important; }
          .id-grid {
            display: grid !important;
            grid-template-columns: 105mm 105mm !important;
            gap: 0 !important;
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-card {
            width: 105mm !important;
            height: 148.5mm !important;
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
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Print IDs</h2>
            <p className="text-sm text-gray-500 mt-1">
              {participants.length} participant{participants.length !== 1 ? "s" : ""}
              {" · "}4 per A4 page
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

      <div className="id-grid grid grid-cols-2 gap-3 pt-6">
        {participants.map((p) => (
          <IdCard key={p.id} participant={p} />
        ))}
        {participants.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 py-12">No participants found.</p>
        )}
      </div>
    </>
  );
}

function IdCard({ participant }: { participant: Participant }) {
  const displayName =
    participant.preferredNameOnId?.trim() ||
    `${participant.firstName} ${participant.lastName}`;
  const fullName = `${participant.firstName} ${participant.lastName}`;
  const qrValue = `dj:participant:${participant.id}`;

  return (
    <div className="id-card flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Header: logo left, event title right */}
      <div className="flex items-center justify-between px-10 py-8 border-gray-100">
        {/* Replace /dj-logo.png with your actual logo file in the public/ folder */}
        <img src="/dj-logo.png" alt="" className="h-28 w-auto object-contain" />
        <p className="text-right text-xl font-normal uppercase tracking-widest text-gray-800 leading-tight">
          DISCIPLESHIP<br />JOURNEY<br />CLASSES
        </p>
      </div>

      {/* Preferred name centered */}
      <div className="flex-1 flex items-center justify-center px-10">
        <p className="text-6xl font-bold text-gray-900 leading-tight text-center capitalize">{displayName.toLowerCase()}</p>
      </div>

      {/* Bottom: event label left, QR right — aligned at bottom */}
      <div className="px-10 pb-4">
        <div className="flex items-end justify-between">
          <p className="text-sm font-semibold text-gray-700 leading-snug">
            June-Oct 2026<br />Discipleship Journey<br />Classes
          </p>
          <div className="p-1.5 border border-gray-100 rounded-md bg-white">
            <QRCode value={qrValue} size={130} />
          </div>
        </div>
        <p className="text-xs text-gray-500 capitalize text-right mt-1">{fullName.toLowerCase()}</p>
      </div>
    </div>
  );
}
