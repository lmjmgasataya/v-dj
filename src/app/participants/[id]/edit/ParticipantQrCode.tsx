"use client";

import QRCode from "react-qr-code";

export function ParticipantQrCode({ participantId, name }: { participantId: number; name: string }) {
  const value = `dj:participant:${participantId}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
      <p className="text-sm font-semibold text-gray-700">QR Code</p>
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 bg-white border border-gray-100 rounded-lg">
          <QRCode value={value} size={160} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-800">{name}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">ID #{participantId}</p>
        </div>
        {/* <p className="text-xs text-gray-400 text-center">
          Show this QR code to an admin volunteer during check-in.
        </p> */}
      </div>
    </div>
  );
}
