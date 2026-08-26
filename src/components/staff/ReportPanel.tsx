"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileDown, GripVertical } from "lucide-react";
import { downloadAppealsReport } from "@/lib/pdfReport";
import {
  allPeriod,
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

type Preset = "all" | "month" | "quarter" | "year" | "custom";

const PRESET_LABEL: Record<Preset, { ru: string; ky: string }> = {
  all: { ru: "Все", ky: "Баары" },
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
 * Панель периода + «Отчёт (PDF)».
 * filters — категории в выдвижном меню (кнопка из трёх вертикальных полос).
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
  onPeriodChange,
  search,
  filters,
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
  onPeriodChange?: (period: ReportPeriod) => void;
  search?: ReactNode;
  filters?: ReactNode;
}) {
  const [preset, setPreset] = useState<Preset>("all");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [quarterIndex, setQuarterIndex] = useState(
    Math.floor(now.getMonth() / 3)
  );
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const period: ReportPeriod = useMemo(() => {
    if (preset === "all") return allPeriod();
    if (preset === "month") return monthPeriod(year, monthIndex);
    if (preset === "quarter") return quarterPeriod(year, quarterIndex);
    if (preset === "year") return yearPeriod(year);
    return customPeriod(customFrom, customTo);
  }, [preset, year, monthIndex, quarterIndex, customFrom, customTo]);

  useEffect(() => {
    onPeriodChange?.(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    if (!filtersOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        filtersRef.current &&
        !filtersRef.current.contains(e.target as Node)
      ) {
        setFiltersOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const inPeriodCount = useMemo(
    () => filterByPeriod(appointments, period).length,
    [appointments, period]
  );

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
        "relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {filters ? (
          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition",
                filtersOpen
                  ? "border-court-navy bg-court-navy text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
              title={isKy ? "Категориялар" : "Категории"}
              aria-expanded={filtersOpen}
              aria-haspopup="true"
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
            {filtersOpen ? (
              <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[11rem] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {isKy ? "Категориялар" : "Категории"}
                </div>
                <div
                  className="flex flex-col gap-1"
                  onClick={() => setFiltersOpen(false)}
                >
                  {filters}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {(["all", "month", "quarter", "year", "custom"] as const).map((p) => (
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
                  title={isKy ? `${label}-чейрек` : `${label} квартал`}
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
          {onPeriodChange ? (
            <span className="ml-1.5 text-slate-400">
              · {isKy ? `${inPeriodCount} жазылуу` : `${inPeriodCount} записей`}
            </span>
          ) : null}
        </div>

        {search}

        <button
          type="button"
          onClick={onDownload}
          className="btn-primary !min-h-10 shrink-0 !text-sm"
        >
          <FileDown className="h-4 w-4" />
          {isKy ? "Отчёт (PDF)" : "Отчёт (PDF)"}
        </button>
      </div>
    </div>
  );
}
