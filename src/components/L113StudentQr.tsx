"use client";

import QRCode from "react-qr-code";
import { l113QrValue } from "@/lib/l113";

/** A student's L113 check-in QR code (value `dj:vgl:<vgLeaderId>`). */
export function L113StudentQr({ vgLeaderId, size = 160 }: { vgLeaderId: number; size?: number }) {
  return <QRCode value={l113QrValue(vgLeaderId)} size={size} />;
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition print:hidden"
    >
      🖨 Print
    </button>
  );
}
