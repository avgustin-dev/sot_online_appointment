"use client";

import { MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { mergeServiceContent, pickLocale } from "@/lib/serviceContent";
import { minutesToTime } from "@/lib/slots";

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
  const { t } = useI18n();
  const sc = mergeServiceContent(state.serviceContent);
  const c = sc.contacts;
  const schedule = sc.leadership.filter((row) => row.showInSchedule);
  const weekdayNames = t.calendar.weekdays;

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
        <a
          href={
            c.mapUrl ||
            "https://2gis.kg/bishkek/firm/70000001019355847?m=74.605178%2C42.879676%2F16"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-court-blue/40 hover:bg-white"
        >
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
        </a>
      </div>

      {showSchedule && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="w-8 py-2 pr-2 font-semibold">№</th>
                <th className="px-2 py-2 font-semibold">{isKy ? "ФИО" : "ФИО"}</th>
                <th className="px-2 py-2 font-semibold">
                  {isKy ? "Кызматы" : "Должность"}
                </th>
                <th className="px-2 py-2 font-semibold">{isKy ? "Күн" : "День"}</th>
                <th className="px-2 py-2 font-semibold">{isKy ? "Убакыт" : "Время"}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="w-8 py-2.5 pr-2 align-top text-xs tabular-nums text-slate-500">
                    {i + 1}
                  </td>
                  <td className="px-2 py-2.5 align-top text-sm font-medium text-court-navy">
                    {pickLocale(isKy, row.fullNameRu, row.fullNameKy)}
                  </td>
                  <td className="px-2 py-2.5 align-top text-xs text-slate-600">
                    {pickLocale(isKy, row.positionRu, row.positionKy)}
                  </td>
                  <td className="px-2 py-2.5 align-top text-sm">
                    {[...row.weekdays]
                      .sort((a, b) => a - b)
                      .map((d) => weekdayNames[d])
                      .join(", ")}
                  </td>
                  <td className="px-2 py-2.5 align-top text-xs tabular-nums text-slate-700">
                    {minutesToTime(row.startMinutes)}–{minutesToTime(row.endMinutes)}
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
