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

/**
 * Saves a student's QR code as a PNG: the code on white with their name underneath. Reads the
 * <svg> that L113StudentQr rendered inside `container`.
 */
export async function downloadL113QrPng(container: HTMLElement | null, name: string, subtitle: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const qrSize = 600;
  const pad = 48;
  const width = qrSize + pad * 2;
  const height = qrSize + pad * 2 + 110;

  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, pad, pad, qrSize, qrSize);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillText(name, width / 2, qrSize + pad + 56, width - pad);
  ctx.fillStyle = "#6b7280";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(subtitle, width / 2, qrSize + pad + 96, width - pad);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}-L113-QR.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
