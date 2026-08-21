"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatDateRu } from "@/lib/slots";
import { targetShort } from "@/lib/targets";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Подтверждение / отказ по заявке гражданина.
 * Крупные кнопки и обязательная причина отказа — чтобы сотрудник
 * не гадал, что нажимать.
 */
export function ReviewRequestPanel({
  appointment,
  isKy,
  onDone,
  compact,
}: {
  appointment: Appointment;
  isKy?: boolean;
  onDone?: (ok: boolean, message: string) => void;
  compact?: boolean;
}) {
  const { currentUser, confirmAppointmentRequest, rejectAppointmentRequest, state } =
    useStore();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [localMsg, setLocalMsg] = useState("");
  const [localErr, setLocalErr] = useState(false);

  if (appointment.status !== "pending_review") return null;
  if (!currentUser) return null;
  if (!["admin", "reception", "leadership", "intake"].includes(currentUser.role)) {
    return (
      <p className="text-sm text-slate-500">
        {isKy
          ? "Ырастоо укугу жарандар менен иштөө бөлүмүнө жана администраторго берилет."
          : "Право подтверждения предоставлено отделу по работе с гражданами и администратору."}
      </p>
    );
  }

  function flash(ok: boolean, text: string) {
    setLocalErr(!ok);
    setLocalMsg(text);
    onDone?.(ok, text);
  }

  async function onConfirm() {
    if (!currentUser) return;
    setBusy(true);
    const res = await confirmAppointmentRequest(
      appointment.id,
      currentUser,
      note.trim() || undefined
    );
    setBusy(false);
    flash(
      res.ok,
      res.ok
        ? isKy
          ? "Ырасталды. Жаранга билдирүү жөнөтүлдү."
          : "Запись подтверждена. Заявителю направлено уведомление."
        : res.error
    );
  }

  async function onReject() {
    if (!currentUser) return;
    setBusy(true);
    const res = await rejectAppointmentRequest(
      appointment.id,
      currentUser,
      reason
    );
    setBusy(false);
    flash(
      res.ok,
      res.ok
        ? isKy
          ? "Заявка ырасталган жок. Себеби жаранга жөнөтүлдү."
          : "В записи отказано. Причина направлена заявителю."
        : res.error
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-sky-200 bg-sky-50/80",
        compact ? "p-3" : "p-4 sm:p-5"
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800">
        {isKy ? "Чечим" : "Решение"}
      </div>
      <h3 className="mt-1 text-base font-semibold text-slate-900">
        {isKy
          ? "Өтүнмө. Жазылуу ырасталгандан кийин гана күчүнө кирет."
          : "Заявка. Запись вступает в силу только после подтверждения."}
      </h3>
      {!compact && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
          <li>
            {isKy
              ? "Кайрылуу конкреттүү сот иши жана сот актысынын мыйзамдуулугу жөнүндө эмес."
              : "Обращение не касается конкретного судебного дела и законности судебного акта."}
          </li>
          <li>
            {isKy
              ? `Кимге: ${targetShort(appointment.targetId, true, state.serviceContent)}. ${formatDateRu(appointment.date)}, ${appointment.slotStart}–${appointment.slotEnd}.`
              : `Адресат: ${targetShort(appointment.targetId, false, state.serviceContent)}. ${formatDateRu(appointment.date)}, ${appointment.slotStart}–${appointment.slotEnd}.`}
          </li>
          <li>
            {isKy
              ? "Тема кабыл алуунун компетенциясында (сот өндүрүшүн уюштуруу, соттун иши, мыйзам боюнча сунуштар)."
              : "Тема относится к компетенции приёма (организация судопроизводства, деятельность суда, предложения по законодательству)."}
          </li>
        </ul>
      )}

      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">
          {isKy
            ? "Эскертме ырастоодо (милдеттүү эмес)"
            : "Заметка при подтверждении (необязательно)"}
        </span>
        <input
          className="input mt-1 w-full bg-white"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            isKy ? "Мисалы: тема ылайыктуу" : "Например: тема в компетенции"
          }
        />
      </label>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-600">
          {isKy
            ? "Баш тартуунун себеби (баш тартсаңыз — милдеттүү)"
            : "Причина отказа (обязательна, если не подтверждаете)"}
        </span>
        <textarea
          className="input mt-1 min-h-[72px] w-full bg-white"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            isKy
              ? "Мисалы: кайрылуу конкреттүү сот иши жөнүндө"
              : "Например: обращение касается конкретного судебного дела"
          }
        />
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          <CheckCircle2 className="h-5 w-5" />
          {isKy ? "Ырастоо. Жаранга билдирүү" : "Подтвердить. Уведомление заявителю"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
        >
          <XCircle className="h-5 w-5" />
          {isKy ? "Баш тартуу" : "Отказать в записи"}
        </button>
      </div>

      {localMsg && !onDone && (
        <p
          className={cn(
            "mt-3 text-sm",
            localErr ? "text-red-800" : "text-emerald-800"
          )}
        >
          {localMsg}
        </p>
      )}
    </div>
  );
}
