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
          .id-card-header {
            background-color: #00428E !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .id-card-header * {
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
          >
            Print
          </button>
        </div>
      </div>

      <div className="id-grid grid grid-cols-2 gap-3">
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
  const qrValue = `dj:participant:${participant.id}`;

  return (
    <div className="id-card flex flex-col border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="id-card-header px-4 py-3 text-center" style={{ backgroundColor: "#00428E" }}>
        <p className="text-lg font-bold uppercase tracking-widest text-white">
          Spiritual <br></br> Foundations
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#a8c4e0" }}>Victory Iloilo</p>
      </div>
      <div className="flex flex-col flex-1 p-4 min-h-52">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-5xl font-bold text-gray-900 leading-tight text-center uppercase">{displayName}</p>
        </div>
        <div className="flex justify-end">
          <div className="p-1.5 border border-gray-100 rounded-md bg-white">
            <QRCode value={qrValue} size={115} />
          </div>
        </div>
      </div>
    </div>
  );
}
