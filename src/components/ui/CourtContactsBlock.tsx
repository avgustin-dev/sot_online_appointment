"use client";

import { MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { mergeServiceContent, pickLocale } from "@/lib/serviceContent";

/** Контакты и график руководства — из CMS публичного сайта */
export function CourtContactsBlock({
  isKy,
  showSchedule = true,
  compact = false,
  className,
}: {
  isKy: boolean;
  showSchedule?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { state } = useStore();
  const sc = mergeServiceContent(state.serviceContent);
  const c = sc.contacts;
  const schedule = sc.leadership.filter((row) => row.showInSchedule);

  return (
    <div
      className={cn(
        "rounded-lg border border-court-line bg-white shadow-sm",
        compact ? "p-4" : "p-5",
        className
      )}
    >
      <h2
        className={cn(
          "font-semibold text-court-navy",
          compact ? "text-sm" : "text-base"
        )}
      >
        {isKy
          ? "Байланыш жана кабыл алуу графиги"
          : "Контакты и график приёма граждан"}
      </h2>
      <p className="mt-1 text-xs text-court-muted">
        {pickLocale(isKy, c.sourceNoteRu, c.sourceNoteKy)}
      </p>

      <div
        className={cn(
          "mt-3 grid gap-3",
          compact ? "sm:grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        <a
          href={`tel:${c.trustPhoneTel}`}
          className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-court-blue/40"
        >
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-court-blue" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {isKy ? "Ишеним телефону" : "Телефон доверия"}
            </div>
            <div className="font-semibold tabular-nums text-court-navy">
              {c.trustPhone}
            </div>
          </div>
        </a>
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-court-blue" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {isKy ? "Дарек" : "Адрес"}
            </div>
            <div className="text-sm font-medium text-court-navy">
              {pickLocale(isKy, c.addressRu, c.addressKy)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {pickLocale(isKy, c.receptionOfficeRu, c.receptionOfficeKy)}
            </div>
          </div>
        </div>
      </div>

      {showSchedule && (
        <div className="mt-4 overflow-x-auto">
          <table className="admin-table min-w-[520px] [&_th]:!text-left [&_td]:!text-left">
            <thead>
              <tr>
                <th className="!px-2 !py-2">№</th>
                <th className="!px-2 !py-2">{isKy ? "ФИО" : "ФИО"}</th>
                <th className="!px-2 !py-2">
                  {isKy ? "Кызматы" : "Должность"}
                </th>
                <th className="!px-2 !py-2">{isKy ? "Күн" : "День"}</th>
                <th className="!px-2 !py-2">{isKy ? "Убакыт" : "Время"}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={row.id}>
                  <td className="!px-2 !py-2 font-mono text-xs text-slate-500">
                    {i + 1}
                  </td>
                  <td className="!px-2 !py-2 text-sm font-medium">
                    {pickLocale(isKy, row.fullNameRu, row.fullNameKy)}
                  </td>
                  <td className="!px-2 !py-2 text-xs text-slate-600">
                    {pickLocale(isKy, row.positionRu, row.positionKy)}
                  </td>
                  <td className="!px-2 !py-2 text-sm">
                    {pickLocale(isKy, row.weekdayRu, row.weekdayKy)}
                  </td>
                  <td className="!px-2 !py-2 text-xs tabular-nums text-slate-700">
                    {pickLocale(isKy, row.timeRu, row.timeKy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-400">
            {pickLocale(isKy, c.scheduleFootnoteRu, c.scheduleFootnoteKy)}
          </p>
        </div>
      )}
    </div>
  );
}
