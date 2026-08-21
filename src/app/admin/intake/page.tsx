"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Inbox, LogOut } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PageLoader } from "@/components/ui/PageLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { EmblemKR } from "@/components/brand/Emblem";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateRu, weekdayRu } from "@/lib/slots";
import { targetShort } from "@/lib/targets";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

const FINAL_STATUSES = new Set(["cancelled", "rejected", "completed"]);

/**
 * Отдельный минимальный интерфейс приёмного отдела: только журнал заявок
 * и три действия — принять, отклонить, перенести. Никакого общего меню кабинета.
 */
export default function IntakeJournalPage() {
  const { ready, state, currentUser, logout, staffRescheduleAppointment } =
    useStore();
  const { t, lang } = useI18n();
  const router = useRouter();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const [openId, setOpenId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      router.replace("/admin/login");
      return;
    }
    if (currentUser.role !== "intake" && currentUser.role !== "admin") {
      router.replace("/admin");
    }
  }, [ready, currentUser, router]);

  const journal = useMemo(
    () =>
      [...state.appointments].sort((a, b) => {
        const aPending = a.status === "pending_review" ? 0 : 1;
        const bPending = b.status === "pending_review" ? 0 : 1;
        if (aPending !== bPending) return aPending - bPending;
        return `${b.date}${b.slotStart}`.localeCompare(`${a.date}${a.slotStart}`);
      }),
    [state.appointments]
  );

  if (!ready || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <PageLoader label={L("Загрузка…", "Жүктөлүүдө…")} />
      </div>
    );
  }

  function startReschedule(apt: Appointment) {
    setRescheduleId(apt.id);
    setOpenId(apt.id);
    setNewDate("");
    setNewSlotStart("");
    setNewSlotEnd("");
  }

  async function onReschedule(apt: Appointment) {
    if (!currentUser) return;
    if (!newDate || !newSlotStart) {
      setErr(true);
      setFlash(L("Выберите дату и время.", "Күн жана убакытты тандаңыз."));
      return;
    }
    setBusy(true);
    const res = await staffRescheduleAppointment(
      apt.id,
      newDate,
      newSlotStart,
      newSlotEnd,
      currentUser
    );
    setBusy(false);
    setErr(!res.ok);
    setFlash(
      res.ok
        ? L("Запись перенесена.", "Жазылуу которулду.")
        : res.error
    );
    if (res.ok) {
      setRescheduleId(null);
      setOpenId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <EmblemKR size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">
              {L("Приёмный отдел — журнал заявок", "Кабыл алуу бөлүмү — өтүнмөлөр журналы")}
            </div>
            <div className="truncate text-xs text-slate-500">
              {currentUser.fullName}
            </div>
          </div>
          <LangSwitch />
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {L("Выход", "Чыгуу")}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {flash && (
          <div
            className={cn(
              "mb-4 rounded-lg border px-4 py-3 text-sm",
              err
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            )}
          >
            {flash}
          </div>
        )}

        {journal.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={L("Заявок пока нет", "Азырынча өтүнмө жок")}
            description={L("Новые заявки появятся здесь.", "Жаңы өтүнмөлөр бул жерде көрүнөт.")}
            className="bg-white"
          />
        ) : (
          <ul className="space-y-3">
            {journal.map((apt) => {
              const isOpen = openId === apt.id;
              const isFinal = FINAL_STATUSES.has(apt.status);
              return (
                <li
                  key={apt.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(isOpen ? null : apt.id);
                      setRescheduleId(null);
                    }}
                    className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left sm:gap-3"
                  >
                    <StatusBadge status={apt.status} />
                    <span className="font-mono text-sm font-semibold text-court-navy">
                      {apt.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {apt.fullName} · {apt.topic}
                    </span>
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {formatDateRu(apt.date)} {apt.slotStart}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-4 sm:p-5">
                      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-slate-400">
                            {L("К кому", "Кимге")}
                          </dt>
                          <dd className="font-medium">
                            {targetShort(apt.targetId, isKy, state.serviceContent)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-slate-400">
                            {L("Дата и время", "Күн жана убакыт")}
                          </dt>
                          <dd className="font-medium">
                            {formatDateRu(apt.date)} ({weekdayRu(apt.date)}) ·{" "}
                            {apt.slotStart}–{apt.slotEnd}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-slate-400">
                            {L("Телефон", "Телефон")}
                          </dt>
                          <dd className="font-medium">{apt.phone}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase text-slate-400">
                            {L("Категория", "Категория")}
                          </dt>
                          <dd className="font-medium">{t.categories[apt.category]}</dd>
                        </div>
                      </dl>

                      {apt.status === "pending_review" && (
                        <ReviewRequestPanel
                          appointment={apt}
                          isKy={isKy}
                          compact
                          onDone={(ok, message) => {
                            setErr(!ok);
                            setFlash(message);
                            if (ok) setOpenId(null);
                          }}
                        />
                      )}

                      {!isFinal && rescheduleId !== apt.id && (
                        <button
                          type="button"
                          onClick={() => startReschedule(apt)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <CalendarClock className="h-4 w-4" />
                          {L("Перенести запись", "Жазылууну которуу")}
                        </button>
                      )}

                      {rescheduleId === apt.id && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {L("Новая дата и время", "Жаңы күн жана убакыт")}
                          </h3>
                          <SlotPicker
                            date={newDate}
                            slotStart={newSlotStart}
                            onDateChange={setNewDate}
                            onSlotChange={(s, e) => {
                              setNewSlotStart(s);
                              setNewSlotEnd(e);
                            }}
                            excludeAppointmentId={apt.id}
                            targetId={apt.targetId}
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onReschedule(apt)}
                              className="btn-primary !text-sm"
                            >
                              {L("Перенести", "Которуу")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRescheduleId(null)}
                              className="btn-outline !text-sm"
                            >
                              {L("Отмена", "Жокко чыгаруу")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
