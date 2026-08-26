"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { formatDateRu, minutesToTime, weekdayRu } from "@/lib/slots";
import { cn } from "@/lib/utils";
import { resolveTargetWindow, targetShort } from "@/lib/targets";
import { backend } from "@/api/client";
import { useRemoteApi } from "@/config/env";
import { listLocalDates, listLocalSlots } from "@/lib/storeLocal";
import type { TimeSlot } from "@/lib/types";

/**
 * Строгий календарь записи (гос.стиль, удобный):
 * слева — месяц, справа — слоты.
 * Если задан NEXT_PUBLIC_API_URL — доступные дни и слоты берутся с бэкенда
 * (GET /public/dates, GET /public/slots). Если бэкенда нет (локальный контур
 * на Zustand), они считаются на фронте по графику из /admin/settings и
 * /admin/my-schedule — см. src/lib/storeLocal.ts.
 */
export function SlotPicker({
  date,
  slotStart,
  onDateChange,
  onSlotChange,
  excludeAppointmentId,
  targetId,
}: {
  date: string;
  slotStart: string;
  onDateChange: (d: string) => void;
  onSlotChange: (start: string, end: string) => void;
  excludeAppointmentId?: string;
  targetId?: string;
}) {
  const { state, ready } = useStore();
  const { t, lang } = useI18n();
  const c = t.calendar;
  const isKy = lang === "ky";
  const target = targetId || "reception";

  const [remoteDates, setRemoteDates] = useState<string[] | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!useRemoteApi) return;
    if (!ready) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс перед перезапросом с бэкенда
      setRemoteDates(null);
      return;
    }
    let cancelled = false;
    backend.public
      .dates(target)
      .then((r) => {
        if (!cancelled) setRemoteDates(r.dates);
      })
      .catch(() => {
        if (!cancelled) setRemoteDates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, target]);

  useEffect(() => {
    if (!useRemoteApi) return;
    if (!ready || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс перед перезапросом с бэкенда
      setRemoteSlots(null);
      setSlotsLoading(false);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    backend.public
      .slots(date, target, excludeAppointmentId)
      .then((r) => {
        if (!cancelled) setRemoteSlots(r.slots);
      })
      .catch(() => {
        if (!cancelled) setRemoteSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, date, target, excludeAppointmentId]);

  // Локальный контур (без API): график считаем сразу из состояния (Zustand),
  // которое правит админка (/admin/settings, /admin/my-schedule).
  const localDates = useMemo(
    () => (ready && !useRemoteApi ? listLocalDates(state, target) : []),
    [ready, state, target]
  );
  const localSlots = useMemo(
    () =>
      ready && !useRemoteApi && date
        ? listLocalSlots(state, date, target, excludeAppointmentId)
        : [],
    [ready, state, date, target, excludeAppointmentId]
  );

  const availableDates = useRemoteApi ? remoteDates : localDates;

  const availableSet = useMemo(
    () => new Set(availableDates ?? []),
    [availableDates]
  );

  const initialMonth = date
    ? startOfMonth(parseISO(date))
    : startOfMonth(new Date());
  const [month, setMonth] = useState(initialMonth);

  const slots = useRemoteApi ? remoteSlots ?? [] : localSlots;
  const isSlotsLoading = useRemoteApi && slotsLoading;

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const win = resolveTargetWindow(
    targetId || "reception",
    state.calendar,
    state.serviceContent
  );
  const today = startOfDay(new Date());
  const monthLabel = `${c.months[month.getMonth()]} ${month.getFullYear()}`;
  const selectedSlot = slots.find((s) => s.start === slotStart);
  const datesReady = useRemoteApi ? remoteDates !== null : ready;

  function dayStatus(d: Date): "open" | "closed" | "past" | "selected" {
    const key = format(d, "yyyy-MM-dd");
    if (date === key) return "selected";
    if (isBefore(d, today)) return "past";
    return availableSet.has(key) ? "open" : "closed";
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-0 border border-court-line bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Календарь */}
        <div className="border-b border-court-line p-4 lg:border-b-0 lg:border-r sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-court-line pb-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center border border-court-line text-court-ink hover:border-court-blue hover:text-court-blue"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label={c.monthPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm font-semibold uppercase tracking-wide text-court-ink sm:text-base">
              {monthLabel}
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center border border-court-line text-court-ink hover:border-court-blue hover:text-court-blue"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label={c.monthNext}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-court-muted sm:text-xs">
            {c.weekdaysShort.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-court-line">
            {gridDays.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const status = dayStatus(d);
              const inMonth = isSameMonth(d, month);
              const clickable = status === "open" || status === "selected";

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!clickable) return;
                    onDateChange(key);
                    onSlotChange("", "");
                    if (!isSameMonth(d, month)) setMonth(startOfMonth(d));
                  }}
                  className={cn(
                    "relative flex min-h-[2.6rem] flex-col items-center justify-center text-sm font-medium sm:min-h-[3rem]",
                    // Один фон/цвет текста — иначе bg-white + bg-court-blue
                    // дают белый текст на белом (число «пропадает»).
                    status === "selected"
                      ? "bg-court-blue font-semibold text-white"
                      : status === "open" && inMonth
                        ? "bg-white text-court-ink hover:bg-court-light"
                        : "cursor-not-allowed bg-court-mist/80 text-court-muted/50",
                    !inMonth && status !== "selected" && "opacity-45"
                  )}
                  aria-label={`${formatDateRu(key)}, ${weekdayRu(key)}`}
                  aria-pressed={status === "selected"}
                >
                  <span>{d.getDate()}</span>
                  {status === "open" && inMonth && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-court-gold" />
                  )}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-court-line pt-3 text-xs text-court-muted">
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-white ring-1 ring-court-line" />
              <span className="h-1 w-1 rounded-full bg-court-gold" />
              {c.legendOpen}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-court-blue" />
              {c.legendSelected}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 bg-court-mist ring-1 ring-court-line" />
              {c.legendClosed}
            </li>
          </ul>
        </div>

        {/* Слоты */}
        <div className="flex flex-col p-4 sm:p-5">
          <div className="mb-3 border-b border-court-line pb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-court-muted">
              {c.titleTime}
            </div>
            <div className="mt-1 text-sm font-semibold text-court-ink">
              {date
                ? `${formatDateRu(date)} (${weekdayRu(date, t.calendar.weekdays)})`
                : c.pickDateFirst}
            </div>
            <p className="mt-1 text-xs text-court-muted">{c.duration}</p>
          </div>

          <div className="min-h-[12rem] flex-1">
            {!date ? (
              <p className="border border-dashed border-court-line bg-court-mist px-4 py-8 text-center text-sm text-court-muted">
                {c.pickDateFirst}
              </p>
            ) : isSlotsLoading ? (
              <p className="border border-dashed border-court-line bg-court-mist px-4 py-8 text-center text-sm text-court-muted">
                {isKy ? "Убакыт жүктөлүүдө…" : "Загрузка времени…"}
              </p>
            ) : slots.length === 0 ? (
              <p className="border border-court-line bg-court-mist px-4 py-6 text-sm text-court-ink">
                {c.noSlots}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                {slots.map((s) => {
                  const active = slotStart === s.start;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => onSlotChange(s.start, s.end)}
                      className={cn(
                        "min-h-[2.75rem] border px-3 py-2 text-center font-mono text-sm font-medium tracking-wide transition-colors",
                        active
                          ? "border-court-blue bg-court-blue text-white"
                          : "border-court-line bg-white text-court-ink hover:border-court-blue hover:text-court-blue"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-4 border-t border-court-line pt-3 text-xs text-court-muted">
            {targetId ? (
              <>
                {isKy ? "Адресат" : "Адресат"}:{" "}
                <strong className="text-court-ink">
                  {targetShort(targetId, isKy, state.serviceContent)}
                </strong>
                .{" "}
              </>
            ) : null}
            {isKy ? "Иш убактысы" : "Окно приёма"}:{" "}
            {minutesToTime(win.startMinutes)} – {minutesToTime(win.endMinutes)}.
            20 {isKy ? "мүн. + 5 мүн. тыныгуу" : "мин + 5 мин перерыв"}.
          </p>
        </div>
      </div>

      {/* Итог выбора — нейтральный, без зелёного «успеха» */}
      {date && (
        <div
          className="border border-court-line bg-court-mist px-4 py-3 text-sm"
          role="status"
        >
          <span className="font-semibold text-court-ink">{c.yourChoice}:</span>{" "}
          <span className="text-court-ink">
            {formatDateRu(date)}
            {selectedSlot ? (
              <>
                , <span className="font-mono font-medium">{selectedSlot.label}</span>
              </>
            ) : (
              <span className="text-court-muted">
                {" "}
                — {isKy ? "убакытты тандаңыз" : "выберите время"}
              </span>
            )}
          </span>
        </div>
      )}

      {!availableSet.size && ready && datesReady && (
        <p className="border border-court-line bg-court-mist px-3 py-2 text-sm text-court-ink">
          {c.noDates}
        </p>
      )}
    </div>
  );
}
