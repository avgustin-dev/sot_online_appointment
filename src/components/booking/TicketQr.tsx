"use client";

import { QRCodeSVG } from "qrcode.react";
import { ticketQrValue } from "@/lib/ticketUrl";

/**
 * QR талона: ссылка на статус записи (код в query). PIN в QR нет.
 * Рисуется локально (SVG), без внешнего api.qrserver.com.
 */
export function TicketQr({
  code,
  isKy,
}: {
  code: string;
  isKy?: boolean;
}) {
  const value = ticketQrValue(code);

  return (
    <div className="mx-auto text-center">
      <div className="inline-block border border-court-line bg-white p-1.5">
        <QRCodeSVG
          value={value}
          size={132}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0b2540"
        />
      </div>
      <div className="mt-1 font-mono text-[10px] font-semibold tracking-wide text-court-navy">
        {code}
      </div>
      <p className="mt-1 max-w-[140px] text-[10px] leading-snug text-slate-500">
        {isKy
          ? "Скан: статус жазылуу. PIN талондо, Qr'да жок."
          : "Скан: страница статуса. QR странице, PIN отсутствует."}
      </p>
    </div>
  );
}
