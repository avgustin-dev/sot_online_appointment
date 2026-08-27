"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  formatDateRu,
  listAvailableDates,
  weekdayRu,
} from "@/lib/slots";
import { StatusBadge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { targetShort } from "@/lib/targets";

/**
 * Календарь для сотрудников: список записей по дням (не «пустые слоты»).
 * Свободные окна — краткая сводка. Действия: открыть, отменить, вернуть.
 */
export default function StaffCalendarPage() {
  const {
    state,
    currentUser,
    staffCancelAppointment,
    staffRestoreAppointment,
  } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  const dates = useMemo(() => {
    const fromCal = listAvailableDates(state.calendar);
    const fromApts = [
      ...new Set(state.appointments.map((a) => a.date)),
    ].sort();
    const set = new Set([...fromCal, ...fromApts]);
    return Array.from(set).sort().slice(0, 21);
  }, [state.calendar, state.appointments]);

  const [date, setDate] = useState(dates[0] || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [showFree, setShowFree] = useState(false);

  const [reviewId, setReviewId] = useState<string | null>(null);

  const dayApts = useMemo(() => {
    return state.appointments
      .filter((a) => a.date === date)
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }, [state.appointments, date]);

  const activeCount = dayApts.filter(
    (a) => a.status !== "cancelled" && a.status !== "rejected"
  ).length;
  const pendingCount = dayApts.filter((a) => a.status === "pending_review").length;

  function appealId(appointmentId: string) {
    return state.appeals.find((a) => a.appointmentId === appointmentId)?.id;
  }

  function canAct() {
    return (
      currentUser &&
      ["admin", "reception", "leadership"].includes(currentUser.role)
    );
  }

  async function run(
    fn: () =>
      | Promise<{ ok: true } | { ok: false; error: string }>
      | { ok: true }
      | { ok: false; error: string },
    okMsg: string
  ) {
    const res = await fn();
    if (!res.ok) {
      setErr(true);
      setMsg(res.error);
      return;
    }
    setErr(false);
    setMsg(okMsg);
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.calendar },
        ]}
      />
      <AdminHeading
        title={isKy ? "Расписание" : "Расписание"}
        lead={
          isKy
            ? "Күн боюнча тизме. Өтүнмө — ырастоо же жокко чыгаруу."
            : "Записи по дням. Заявка — подтверждение или отмена."
        }
      />

      {msg && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          )}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {dates.map((d) => {
          const n = state.appointments.filter(
            (a) =>
              a.date === d &&
              a.status !== "cancelled" &&
              a.status !== "rejected"
          ).length;
          const p = state.appointments.filter(
            (a) => a.date === d && a.status === "pending_review"
          ).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDate(d);
                setMsg("");
              }}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                date === d
                  ? "border-court-navy bg-court-navy text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="text-sm font-semibold">{formatDateRu(d)}</div>
              <div
                className={cn(
                  "text-xs capitalize",
                  date === d ? "text-white/70" : "text-slate-500"
                )}
              >
                {weekdayRu(d)}
              </div>
              <div
                className={cn(
                  "mt-1 text-[11px] font-medium",
                  date === d ? "text-white/90" : "text-slate-600"
                )}
              >
                {n} {isKy ? "адам" : "чел."}
                {p > 0 ? ` · ${p} ${isKy ? "өтүнмө" : "заяв."}` : ""}
              </div>
            </button>
          );
        })}
      </div>

      {date && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                {formatDateRu(date)} · {weekdayRu(date)}
              </h2>
              <p className="text-xs text-slate-500">
                {isKy ? "Активдүү" : "Активных"}: {activeCount}
                {pendingCount > 0 &&
                  ` · ${isKy ? "текшерүүдө" : "на проверке"}: ${pendingCount}`}
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="text-xs font-medium text-court-blue hover:underline"
            >
              {isKy ? "Графикти жөндөө" : "Настроить график"}
            </Link>
          </div>

          {dayApts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              {isKy
                ? "Бул күнгө жазылуу жок."
                : "На этот день записей нет. Гражданин записывается через публичный раздел электронной записи."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dayApts.map((apt) => {
                const aplId = appealId(apt.id);
                return (
                  <li
                    key={apt.id}
                    className={cn(
                      apt.status === "cancelled" && "bg-slate-50/80 opacity-80",
                      apt.status === "rejected" && "bg-slate-50/80 opacity-80",
                      apt.status === "pending_review" && "bg-sky-50/60"
                    )}
                  >
                    <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <Link
                      href={
                        aplId ? `/admin/appeals/${aplId}` : "/admin/appeals"
                      }
                      className="min-w-0 flex-1 transition hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-court-navy">
                          {apt.slotStart}–{apt.slotEnd}
                        </span>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="mt-0.5 font-medium text-slate-900" title={apt.fullName}>
                        {apt.fullName}
                      </div>
                      <div
                        className="truncate text-xs text-slate-500"
                        title={`${targetShort(apt.targetId, isKy, state.serviceContent)} · ${apt.topic} · ${apt.phone}`}
                      >
                        {targetShort(apt.targetId, isKy, state.serviceContent)}
                        {" · "}
                        {apt.topic} · {apt.phone}
                      </div>
                    </Link>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {aplId && (
                        <Link
                          href={`/admin/appeals/${aplId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {isKy ? "Карточка" : "Карточка"}
                        </Link>
                      )}
                      {canAct() && apt.status === "pending_review" && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-950 hover:bg-sky-100"
                          onClick={() =>
                            setReviewId(reviewId === apt.id ? null : apt.id)
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isKy ? "Чечим" : "Решение"}
                        </button>
                      )}
                      {canAct() &&
                        apt.status !== "cancelled" &&
                        apt.status !== "accepted" &&
                        apt.status !== "completed" &&
                        apt.status !== "pending_review" &&
                        apt.status !== "rejected" &&
                        apt.status !== "no_show" && (
                          <button
                            type="button"
                            title={isKy ? "Жокко чыгаруу" : "Отменить"}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                            onClick={() => {
                              if (
                                !currentUser ||
                                !confirm(
                                  isKy
                                    ? "Жазылууну жокко чыгарасызбы?"
                                    : "Отменить эту запись?"
                                )
                              )
                                return;
                              run(
                                () =>
                                  staffCancelAppointment(
                                    apt.id,
                                    currentUser
                                  ),
                                isKy ? "Жокко чыгарылды" : "Запись отменена"
                              );
                            }}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {isKy ? "Жокко" : "Отмена"}
                          </button>
                        )}
                      {canAct() &&
                        (apt.status === "cancelled" ||
                          apt.status === "no_show" ||
                          apt.status === "rejected") && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                            onClick={() =>
                              currentUser &&
                              run(
                                () =>
                                  staffRestoreAppointment(
                                    apt.id,
                                    currentUser
                                  ),
                                isKy
                                  ? "Калыбына келтирилди"
                                  : "Запись восстановлена"
                              )
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {isKy ? "Кайтаруу" : "Вернуть"}
                          </button>
                        )}
                    </div>
                    </div>
                    {reviewId === apt.id &&
                      apt.status === "pending_review" && (
                        <div className="px-4 pb-4 sm:px-5">
                          <ReviewRequestPanel
                            appointment={apt}
                            isKy={isKy}
                            compact
                            onDone={(ok, message) => {
                              setReviewId(null);
                              setErr(!ok);
                              setMsg(message);
                            }}
                          />
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setShowFree((v) => !v)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showFree
                ? isKy
                  ? "▼ Бош убакытты жашыруу"
                  : "▼ Скрыть сводку по свободным окнам"
                : isKy
                  ? "▶ Бош убакыт (кыскача)"
                  : "▶ Свободные окна (кратко, не список слотов)"}
            </button>
            {showFree && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {isKy
                  ? "График жана узактыгы — «График приёма». Жарандар электрондук жазылуу бөлүмүндө бош терезени тандашат. Бул жерде негизги нерсе — ким качан жазылган."
                  : "Дни и длительность слота настраиваются в «График приёма». Граждане сами выбирают свободное окно в разделе электронной записи. Здесь главное — кто и когда записан, а не сетка пустых интервалов."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
