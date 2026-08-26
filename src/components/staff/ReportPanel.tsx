"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { downloadAppealsReport } from "@/lib/pdfReport";
import {
  customPeriod,
  filterByPeriod,
  monthPeriod,
  quarterPeriod,
  QUARTER_ROMAN,
  todayIso,
  yearPeriod,
  type ReportPeriod,
} from "@/lib/reportPeriods";
import { cn } from "@/lib/utils";
import type { AppealCard, Appointment, ServiceContent } from "@/lib/types";

type Preset = "month" | "quarter" | "year" | "custom";

const PRESET_LABEL: Record<Preset, { ru: string; ky: string }> = {
  month: { ru: "Месяц", ky: "Ай" },
  quarter: { ru: "Квартал", ky: "Чейрек" },
  year: { ru: "Год", ky: "Жыл" },
  custom: { ru: "Период…", ky: "Мезгил…" },
};

const MONTH_OPTIONS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

/**
 * Панель формирования печатного отчёта: выбор периода (месяц/квартал/год/
 * произвольный диапазон) + кнопка «Отчёт (PDF)». Используется на страницах
 * «Заявки» и «Мониторинг» — печатает записи и обращения только за период.
 * Для месяца и квартала можно выбрать любой год и любой квартал (I–IV),
 * а не только текущий.
 */
export function ReportPanel({
  appeals,
  appointments,
  serviceContent,
  isKy,
  lang,
  orgName,
  reportTitle,
  reportSubtitle,
  className,
}: {
  appeals: AppealCard[];
  appointments: Appointment[];
  serviceContent: ServiceContent;
  isKy: boolean;
  lang: "ru" | "ky";
  orgName: string;
  reportTitle: string;
  reportSubtitle: string;
  className?: string;
}) {
  const [preset, setPreset] = useState<Preset>("month");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [quarterIndex, setQuarterIndex] = useState(Math.floor(now.getMonth() / 3));
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  const period: ReportPeriod = useMemo(() => {
    if (preset === "month") return monthPeriod(year, monthIndex);
    if (preset === "quarter") return quarterPeriod(year, quarterIndex);
    if (preset === "year") return yearPeriod(year);
    return customPeriod(customFrom, customTo);
  }, [preset, year, monthIndex, quarterIndex, customFrom, customTo]);

  function onDownload() {
    const periodAppointments = filterByPeriod(appointments, period);
    const ids = new Set(periodAppointments.map((a) => a.id));
    const periodAppeals = appeals.filter((a) => ids.has(a.appointmentId));
    downloadAppealsReport({
      appeals: periodAppeals,
      appointments: periodAppointments,
      serviceContent,
      period,
      title: reportTitle,
      subtitle: reportSubtitle,
      orgName,
      lang,
    });
  }

  const yearSelect = (
    <select
      className="input !h-9 w-[84px] !py-1 !text-xs"
      value={year}
      onChange={(e) => setYear(Number(e.target.value))}
    >
      {YEAR_OPTIONS.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap gap-1.5">
        {(["month", "quarter", "year", "custom"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              preset === p
                ? "border-court-navy bg-court-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {isKy ? PRESET_LABEL[p].ky : PRESET_LABEL[p].ru}
          </button>
        ))}
      </div>

      {preset === "month" && (
        <div className="flex items-center gap-1.5">
          <select
            className="input !h-9 !py-1 !text-xs"
            value={monthIndex}
            onChange={(e) => setMonthIndex(Number(e.target.value))}
          >
            {MONTH_OPTIONS_RU.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          {yearSelect}
        </div>
      )}

      {preset === "quarter" && (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {QUARTER_ROMAN.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuarterIndex(i)}
                className={cn(
                  "h-9 w-9 rounded-lg border text-xs font-semibold transition",
                  quarterIndex === i
                    ? "border-court-navy bg-court-navy text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
                title={
                  isKy ? `${label}-чейрек` : `${label} квартал`
                }
              >
                {label}
              </button>
            ))}
          </div>
          {yearSelect}
        </div>
      )}

      {preset === "year" && yearSelect}

      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            className="input !h-9 !py-1 !text-xs"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span className="text-slate-400">—</span>
          <input
            type="date"
            className="input !h-9 !py-1 !text-xs"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
      )}

      <div className="min-w-0 flex-1 truncate text-xs text-slate-500">
        {isKy ? period.labelKy : period.labelRu}
      </div>

      <button
        type="button"
        onClick={onDownload}
        className="btn-primary !min-h-10 shrink-0 !text-sm"
      >
        <FileDown className="h-4 w-4" />
        {isKy ? "Отчёт (PDF)" : "Отчёт (PDF)"}
      </button>
    </div>
  );
}
