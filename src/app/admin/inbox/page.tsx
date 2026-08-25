"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, CalendarClock, ExternalLink, Inbox } from "lucide-react";
import { useStore } from "@/lib/store";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { formatDateRu, weekdayRu } from "@/lib/slots";
import { targetShort } from "@/lib/targets";
import { useI18n } from "@/lib/i18n";
import type { Appointment } from "@/lib/types";

const FINAL_STATUSES = new Set(["cancelled", "rejected", "completed"]);

export default function InboxPage() {
  const { state, currentUser, staffRescheduleAppointment, staffCancelAppointment } =
    useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [newDate, setNewDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const canCancel = currentUser?.role === "reception" || currentUser?.role === "admin";

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

  const open = journal.find((a) => a.id === openId) || null;

  function openRow(apt: Appointment) {
    setOpenId(apt.id);
    setMode("view");
    setNewDate("");
    setNewSlotStart("");
    setNewSlotEnd("");
  }

  function close() {
    setOpenId(null);
    setMode("view");
  }

  async function onReschedule() {
    if (!currentUser || !open) return;
    if (!newDate || !newSlotStart) {
      setErr(true);
      setFlash(L("Выберите дату и время.", "Күн жана убакытты тандаңыз."));
      return;
    }
    setBusy(true);
    const res = await staffRescheduleAppointment(
      open.id,
      newDate,
      newSlotStart,
      newSlotEnd,
      currentUser
    );
    setBusy(false);
    setErr(!res.ok);
    setFlash(res.ok ? L("Запись перенесена.", "Жазылуу которулду.") : res.error);
    if (res.ok) close();
  }

  async function onCancel() {
    if (!currentUser || !open) return;
    setBusy(true);
    const res = await staffCancelAppointment(open.id, currentUser);
    setBusy(false);
    setErr(!res.ok);
    setFlash(res.ok ? L("Запись отменена.", "Жазылуу жокко чыгарылды.") : res.error);
    if (res.ok) close();
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: isKy ? "Өтүнмөлөр" : "Заявки" },
        ]}
      />
      <AdminHeading
        title={isKy ? "Өтүнмөлөр" : "Заявки"}
        lead={
          isKy
            ? "Журнал. Сапты басыңыз — чечим."
            : "Журнал записей. Нажмите строку — откроется решение."
        }
      />

      {flash && !openId && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {flash}
        </div>
      )}

      {journal.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={isKy ? "Азырынча өтүнмө жок" : "Заявок пока нет"}
          description={L("Новые заявки появятся здесь.", "Жаңы өтүнмөлөр бул жерде көрүнөт.")}
          className="bg-white"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {journal.map((apt) => (
              <li key={apt.id}>
                <button
                  type="button"
                  onClick={() => openRow(apt)}
                  className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:gap-3"
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
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <Modal
          title={`${open.code} · ${open.fullName}`}
          subtitle={
            mode === "reschedule"
              ? L("Новая дата и время", "Жаңы күн жана убакыт")
              : undefined
          }
          onClose={close}
        >
          {mode === "view" ? (
            <div className="space-y-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("К кому", "Кимге")}
                  </dt>
                  <dd className="font-medium">
                    {targetShort(open.targetId, isKy, state.serviceContent)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Дата и время", "Күн жана убакыт")}
                  </dt>
                  <dd className="font-medium">
                    {formatDateRu(open.date)} ({weekdayRu(open.date)}) · {open.slotStart}–
                    {open.slotEnd}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Телефон", "Телефон")}
                  </dt>
                  <dd className="font-medium">{open.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Категория", "Категория")}
                  </dt>
                  <dd className="font-medium">{t.categories[open.category]}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Адрес заявителя", "Кайрылуучунун дареги")}
                  </dt>
                  <dd className="font-medium">
                    {[open.region, open.locality, open.street].filter(Boolean).join(", ") ||
                      "—"}
                  </dd>
                </div>
              </dl>

              {flash && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    err
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {flash}
                </div>
              )}

              {open.status === "pending_review" && (
                <ReviewRequestPanel
                  appointment={open}
                  isKy={isKy}
                  compact
                  onDone={(ok, message) => {
                    setErr(!ok);
                    setFlash(message);
                    if (ok) close();
                  }}
                />
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {!FINAL_STATUSES.has(open.status) && (
                  <button
                    type="button"
                    onClick={() => setMode("reschedule")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    {L("Перенести запись", "Жазылууну которуу")}
                  </button>
                )}
                {canCancel && !FINAL_STATUSES.has(open.status) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />
                    {L("Отменить запись", "Жазылууну жокко чыгаруу")}
                  </button>
                )}
                {(() => {
                  const appeal = state.appeals.find((a) => a.appointmentId === open.id);
                  return appeal ? (
                    <Link
                      href={`/admin/appeals/${appeal.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {L("Полная карточка", "Толук карточка")}
                    </Link>
                  ) : null;
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <SlotPicker
                date={newDate}
                slotStart={newSlotStart}
                onDateChange={setNewDate}
                onSlotChange={(s, e) => {
                  setNewSlotStart(s);
                  setNewSlotEnd(e);
                }}
                excludeAppointmentId={open.id}
                targetId={open.targetId}
              />
              {flash && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    err
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {flash}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onReschedule}
                  className="btn-primary !text-sm"
                >
                  {L("Перенести", "Которуу")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="btn-outline !text-sm"
                >
                  {L("Отмена", "Жокко чыгаруу")}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
