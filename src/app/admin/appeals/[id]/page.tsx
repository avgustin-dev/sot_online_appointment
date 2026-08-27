"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bell,
  History,
  Ban,
  RotateCcw,
  CalendarClock,
  Send,
  UserCheck,
  ClipboardList,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge, StatusBadge } from "@/components/ui/Badge";
import { formatDateRu } from "@/lib/slots";
import { stageProgress, cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Collapsible } from "@/components/ui/Collapsible";
import { useI18n } from "@/lib/i18n";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { targetPerson, targetShort } from "@/lib/targets";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { assignmentStatusLabel } from "@/lib/assignment";
import { can } from "@/lib/acl";
import type { AppealCategory } from "@/lib/types";

/**
 * Карточка обращения — информация + компактные действия по этапам:
 * подготовка (приёмная), личный приём с протоколом и первым поручением
 * (руководство), затем поручить/исполнить самому (после приёма), перенос и
 * отмена записи. Смена статуса записи и этапа обращения вручную больше не
 * нужна: каждый статус/этап наступает как следствие настоящего действия
 * (подтверждение, приём, ответ, оценка) — см. историю правок статусов.
 */
export default function AppealDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const {
    state,
    currentUser,
    getPreviousAppeals,
    staffCancelAppointment,
    staffRestoreAppointment,
    staffRescheduleAppointment,
    assignAppeal,
    completePrep,
    completeReception,
  } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  const appeal = state.appeals.find((a) => a.id === id);
  const appointment = state.appointments.find(
    (a) => a.id === appeal?.appointmentId
  );
  const previous = useMemo(
    () => (appeal ? getPreviousAppeals(appeal) : []),
    [appeal, getPreviousAppeals]
  );

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  // назначение поручения
  const [assignMode, setAssignMode] = useState<null | "pick">(null);
  const [assignId, setAssignId] = useState("");
  const [assignText, setAssignText] = useState("");

  // перенос записи
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");

  // подготовка карточки
  const [prepOpen, setPrepOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [prepCategory, setPrepCategory] = useState<AppealCategory>("organization");

  // протокол личного приёма
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [leadershipExplanation, setLeadershipExplanation] = useState("");
  const [assignmentText, setAssignmentText] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [specialistsInvolved, setSpecialistsInvolved] = useState("");

  useEffect(() => {
    if (!appeal) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подгрузка формы при смене карточки/её обновлении
    setAssignId(appeal.assignment?.responsibleUserId || "");
    setAssignText(appeal.assignment?.text || "");
    setSummary(appeal.summary || "");
    setPrepNotes(appeal.prepNotes || "");
    setPrepCategory(appeal.category);
  }, [appeal?.id, appeal?.updatedAt]);

  useEffect(() => {
    if (!appointment) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подгрузка формы при смене записи/её обновлении
    setNewDate(appointment.date);
    setNewSlotStart(appointment.slotStart);
    setNewSlotEnd(appointment.slotEnd);
  }, [appointment?.id, appointment?.updatedAt]);

  if (!appeal) {
    return (
      <div className="card p-8 text-center">
        <p className="text-court-muted">Карточка не найдена.</p>
        <Link
          href={
            currentUser?.role === "responsible" ||
            currentUser?.role === "leadership"
              ? "/admin/control"
              : "/admin/appeals"
          }
          className="btn-outline mt-4"
        >
          Назад
        </Link>
      </div>
    );
  }

  // Исполнитель: свои поручения или приём на свой адресат (если есть targetId)
  const cardDenied =
    !!currentUser &&
    currentUser.role === "responsible" &&
    appeal.assignment?.responsibleUserId !== currentUser.id &&
    !(
      currentUser.targetId &&
      appointment?.targetId === currentUser.targetId
    );

  if (cardDenied) {
    return (
      <div className="card p-8 text-center">
        <p className="text-court-muted">
          {isKy
            ? "Бул карточкага кирүү жок: тапшырма башка аткаруучуга берилген."
            : "Нет доступа: поручение назначено другому исполнителю."}
        </p>
        <Link href="/admin/control" className="btn-outline mt-4">
          {isKy ? "Менин тапшырмаларыма" : "К моим поручениям"}
        </Link>
      </div>
    );
  }

  const progress = stageProgress(appeal.stage);
  const canAssignRole =
    !!currentUser &&
    (currentUser.role === "leadership" || currentUser.role === "admin");
  // Поручение появляется вместе с протоколом приёма; здесь — только
  // поручить/переназначить уже принятое обращение (в т.ч. себе), иначе
  // поручение осталось бы невидимым исполнителю. После "closed" обращение
  // завершено — поручать уже некому, карточка становится просмотром истории.
  const canAssign = canAssignRole && appeal.stage === "in_control";
  const canCancel = !!currentUser && can(currentUser, "cancelAppointment");
  const canReschedule =
    !!currentUser && can(currentUser, "rescheduleAppointment");
  // Поручение можно дать не только штатному исполнителю, но и
  // руководителю (в т.ч. самому себе) — председатель/заместитель
  // могут вести обращение лично, не передавая его дальше.
  const responsibles = state.staff.filter(
    (s) => s.role === "responsible" || s.role === "leadership"
  );

  const canPrep =
    can(currentUser, "prepCard") &&
    ["registered", "under_review"].includes(appeal.stage) &&
    appointment?.status !== "pending_review" &&
    appointment?.status !== "rejected";
  const canConductReception =
    can(currentUser, "conductReception") &&
    can(currentUser, "assignExecutor") &&
    appeal.stage === "ready_for_reception";

  function flash(ok: boolean, text: string) {
    setErr(!ok);
    setMsg(text);
  }

  async function onAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appeal || !assignId) return;
    const resp = state.staff.find((s) => s.id === assignId);
    if (!resp) return;
    setBusy(true);
    const res = await assignAppeal(
      appeal.id,
      resp.id,
      resp.fullName,
      assignText.trim() || appeal.assignment?.text || "Поручение"
    );
    setBusy(false);
    flash(
      Boolean(res?.ok),
      res?.ok ? "Исполнитель назначен." : res?.error || "Ошибка"
    );
    if (res?.ok) setAssignMode(null);
  }

  async function onSelfAssign() {
    if (!appeal || !currentUser) return;
    setBusy(true);
    const res = await assignAppeal(
      appeal.id,
      currentUser.id,
      currentUser.fullName,
      appeal.assignment?.text || "Принято к исполнению лично."
    );
    setBusy(false);
    flash(
      Boolean(res?.ok),
      res?.ok ? "Вы назначены исполнителем." : res?.error || "Ошибка"
    );
  }

  async function onPrepSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appeal) return;
    setBusy(true);
    const res = await completePrep(appeal.id, currentUser, {
      summary,
      prepNotes,
      category: prepCategory,
    });
    setBusy(false);
    flash(
      Boolean(res?.ok),
      res?.ok
        ? "Подготовка завершена. Готово к личному приёму."
        : res?.error || "Не удалось сохранить"
    );
    if (res?.ok) setPrepOpen(false);
  }

  async function onProtocolSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appeal) return;
    const resp = state.staff.find((s) => s.id === responsibleUserId);
    if (!resp) return;
    const isSelf = resp.id === currentUser.id;
    setBusy(true);
    const res = await completeReception(appeal.id, currentUser, {
      citizenStatement: "",
      leadershipExplanation,
      assignmentText: isSelf
        ? assignmentText.trim() || "Принято к исполнению лично."
        : assignmentText,
      responsibleUserId: resp.id,
      responsibleName: resp.fullName,
      specialistsInvolved,
    });
    setBusy(false);
    if (res && "ok" in res && !res.ok) {
      flash(false, res.error);
      return;
    }
    flash(true, "Приём зафиксирован. Поручение передано на контроль.");
    setProtocolOpen(false);
  }

  async function onReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appointment) return;
    setBusy(true);
    const res = await staffRescheduleAppointment(
      appointment.id,
      newDate,
      newSlotStart,
      newSlotEnd,
      currentUser
    );
    setBusy(false);
    flash(res.ok, res.ok ? "Дата и время приёма обновлены." : res.error);
    if (res.ok) setRescheduleOpen(false);
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          currentUser?.role === "responsible" ||
          currentUser?.role === "leadership"
            ? {
                label: isKy ? "Тапшырмалар" : "Поручения",
                href: "/admin/control",
              }
            : { label: t.crumbs.appeals, href: "/admin/appeals" },
          { label: appeal.code },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-court-navy sm:text-3xl">
              {appeal.code}
            </h1>
            <StageBadge stage={appeal.stage} />
            {appointment && <StatusBadge status={appointment.status} />}
          </div>
          <p className="mt-1 text-slate-600">{appeal.fullName}</p>
          <p className="text-sm text-slate-500">
            {appeal.phone}
            {appointment &&
              ` · ${targetShort(appointment.targetId, false, state.serviceContent)} · ${formatDateRu(appointment.date)} ${appointment.slotStart}–${appointment.slotEnd}`}
          </p>
        </div>
      </div>

      {appointment?.status === "pending_review" && (
        <ReviewRequestPanel
          appointment={appointment}
          onDone={(ok, text) => flash(ok, text)}
        />
      )}

      {appointment && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Реквизиты записи
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] text-slate-500">
                Регистрационный код
              </div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-wide text-court-navy">
                {appeal.code}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Проверка статуса на главной странице — по коду
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-medium text-amber-900/80">
                PIN-код
              </div>
              <div className="mt-0.5 font-mono text-xl font-bold tracking-[0.2em] text-amber-950">
                {appointment.pin}
              </div>
              <p className="mt-1 text-[11px] text-amber-900/70">
                Перенос и отмена записи («Моя запись») — код и PIN. Конфиденциально.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] text-slate-500">
                ФИО и должность лица, ведущего приём
              </div>
              {(() => {
                const person = targetPerson(
                  appointment.targetId,
                  false,
                  state.serviceContent
                );
                return (
                  <div className="mt-0.5">
                    <div className="font-medium text-slate-900">
                      {person?.fullName ||
                        targetShort(appointment.targetId, false, state.serviceContent)}
                    </div>
                    {person?.position && (
                      <div className="text-xs text-slate-500">{person.position}</div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] text-slate-500">Адрес заявителя</div>
              <div className="mt-0.5 text-sm text-slate-800">
                {[appeal.region, appeal.locality, appeal.street]
                  .filter(Boolean)
                  .join(", ") || "Не указан"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] text-slate-500">Сопровождающие</div>
              <div className="mt-0.5 text-sm text-slate-800">
                {appointment.companions.length === 0
                  ? "Не указаны"
                  : appointment.companions
                      .map((c) =>
                        c.phone ? `${c.fullName} (${c.phone})` : c.fullName
                      )
                      .join("; ")}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
              <div className="text-[11px] text-slate-500">
                Кому поручено рассмотрение обращения
              </div>
              <div className="mt-0.5 font-medium text-slate-900">
                {appeal.assignment?.responsibleName || "Не назначено"}
                {appeal.assignment?.status
                  ? ` · ${assignmentStatusLabel(appeal.assignment.status)}`
                  : ""}
              </div>
              {appeal.assignment?.text && (
                <p className="mt-1 text-sm text-slate-700">
                  {appeal.assignment.text}
                </p>
              )}
              {canAssign && assignMode !== "pick" && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setAssignMode("pick")}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Поручить
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white hover:bg-court-navy/90 disabled:opacity-60"
                    onClick={onSelfAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Исполнить самому
                  </button>
                </div>
              )}
              {canAssign && assignMode === "pick" && (
                <form
                  className="mt-3 space-y-2 border-t border-slate-100 pt-3"
                  onSubmit={onAssignSubmit}
                >
                  <select
                    className="input w-full"
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    required
                  >
                    <option value="">Выберите ФИО сотрудника</option>
                    {responsibles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} — {s.position}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="input min-h-[64px] w-full"
                    value={assignText}
                    onChange={(e) => setAssignText(e.target.value)}
                    placeholder="Содержание поручения"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="btn-primary !text-sm"
                    >
                      Поручить
                    </button>
                    <button
                      type="button"
                      className="btn-outline !text-sm"
                      onClick={() => setAssignMode(null)}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
              {canAssignRole && !canAssign && appeal.stage === "closed" && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Обращение завершено — ответ гражданину направлен.
                  Поручение больше нельзя переназначить, доступна только
                  история действий ниже.
                </p>
              )}
              {canAssignRole && !canAssign && appeal.stage !== "closed" && (
                <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Поручение появляется вместе с протоколом личного приёма —
                  сначала нажмите «Провести приём» в блоке «Действия» ниже.
                  Здесь можно только поручить (или переназначить) уже
                  принятое обращение.
                </p>
              )}
            </div>
          </div>
          {appointment.reviewNote && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              Заметка при подтверждении/отказе (видна гражданину в «Моей записи»):{" "}
              {appointment.reviewNote}
            </p>
          )}
          {appointment.previousDate && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Прежние дата и время приёма сохраняются при переносе:{" "}
              {formatDateRu(appointment.previousDate)}{" "}
              {appointment.previousSlotStart}–{appointment.previousSlotEnd}.
            </p>
          )}
        </section>
      )}

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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-500">Прогресс цикла</span>
          <span className="font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-court-ribbon transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {appointment &&
        (canCancel || canReschedule || canPrep || canConductReception) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Действия
          </h2>
          <div className="flex flex-wrap gap-2">
            {canPrep && !prepOpen && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white hover:bg-court-navy/90"
                onClick={() => setPrepOpen(true)}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Подготовить карточку
              </button>
            )}
            {canConductReception && !protocolOpen && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white hover:bg-court-navy/90"
                onClick={() => {
                  // Гражданин уже выбрал адресата при записи — по умолчанию
                  // ответственный это он (или ведущий приём, если у адресата
                  // нет своей учётки), а не пустой выбор из общего списка.
                  const byTarget = responsibles.find(
                    (s) => s.targetId === appointment?.targetId
                  );
                  setResponsibleUserId(byTarget?.id || currentUser?.id || "");
                  setProtocolOpen(true);
                }}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Провести приём
              </button>
            )}
            {canCancel &&
              appointment.status !== "cancelled" &&
              appointment.status !== "accepted" &&
              appointment.status !== "completed" && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100"
                  onClick={async () => {
                    if (
                      !currentUser ||
                      !confirm("Отменить запись и обращение?")
                    )
                      return;
                    const r = await staffCancelAppointment(
                      appointment.id,
                      currentUser
                    );
                    flash(r.ok, r.ok ? "Запись отменена." : r.error);
                  }}
                >
                  <Ban className="h-3.5 w-3.5" />
                  Отменить запись
                </button>
              )}
            {canCancel &&
              (appointment.status === "cancelled" ||
                appointment.status === "no_show" ||
                appointment.status === "rejected") && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  onClick={async () => {
                    if (!currentUser) return;
                    const r = await staffRestoreAppointment(
                      appointment.id,
                      currentUser
                    );
                    flash(
                      r.ok,
                      r.ok
                        ? "Запись возвращена в статус «Поступила»."
                        : r.error
                    );
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Вернуть в регистрацию
                </button>
              )}
            {canReschedule && !rescheduleOpen && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setRescheduleOpen(true)}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Перенести запись
              </button>
            )}
            {appeal.stage === "in_control" &&
              currentUser &&
              ["admin", "leadership", "responsible"].includes(
                currentUser.role
              ) && (
                <Link
                  href="/admin/control"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white"
                >
                  К контролю →
                </Link>
              )}
          </div>

          {canReschedule && rescheduleOpen && (
            <form
              onSubmit={onReschedule}
              className="mt-4 space-y-3 border-t border-slate-100 pt-4"
            >
              <SlotPicker
                date={newDate}
                slotStart={newSlotStart}
                onDateChange={(d) => {
                  setNewDate(d);
                  setNewSlotStart("");
                  setNewSlotEnd("");
                }}
                onSlotChange={(s, e) => {
                  setNewSlotStart(s);
                  setNewSlotEnd(e);
                }}
                excludeAppointmentId={appointment.id}
                targetId={appointment.targetId}
              />
              <p className="text-[11px] text-slate-400">
                Сейчас: {formatDateRu(appointment.date)}{" "}
                {appointment.slotStart}–{appointment.slotEnd}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy} className="btn-outline !text-sm">
                  Перенести
                </button>
                <button
                  type="button"
                  className="btn-outline !text-sm"
                  onClick={() => setRescheduleOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {canPrep && prepOpen && (
            <form
              onSubmit={onPrepSubmit}
              className="mt-4 space-y-3 border-t border-slate-100 pt-4"
            >
              <div>
                <label className="label">Категория</label>
                <select
                  className="input w-full"
                  value={prepCategory}
                  onChange={(e) =>
                    setPrepCategory(e.target.value as AppealCategory)
                  }
                >
                  {(Object.keys(t.categories) as AppealCategory[]).map((k) => (
                    <option key={k} value={k}>
                      {t.categories[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Краткое содержание (для руководства)</label>
                <textarea
                  className="input min-h-[72px] w-full"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Заметки подготовки</label>
                <textarea
                  className="input min-h-[88px] w-full"
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy} className="btn-gold !text-sm">
                  Завершить подготовку
                </button>
                <button
                  type="button"
                  className="btn-outline !text-sm"
                  onClick={() => setPrepOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {canConductReception && protocolOpen && (
            <form
              onSubmit={onProtocolSubmit}
              className="mt-4 space-y-3 border-t border-slate-100 pt-4"
            >
              <div>
                <label className="label">Разъяснение руководства</label>
                <textarea
                  className="input min-h-[70px] w-full"
                  value={leadershipExplanation}
                  onChange={(e) => setLeadershipExplanation(e.target.value)}
                  placeholder="Разъяснение в соответствии с законодательством КР (необязательно)…"
                />
              </div>
              <div>
                <label className="label">Ответственный по обращению</label>
                <select
                  className="input w-full"
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  required
                >
                  <option value="">— выберите —</option>
                  {responsibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} — {r.position}
                    </option>
                  ))}
                </select>
              </div>
              {responsibleUserId !== currentUser?.id && (
                <div>
                  <label className="label">Поручение</label>
                  <textarea
                    className="input min-h-[60px] w-full"
                    value={assignmentText}
                    onChange={(e) => setAssignmentText(e.target.value)}
                    required
                    placeholder="Содержание поручения ответственному…"
                  />
                </div>
              )}
              <div>
                <label className="label">Привлечённые специалисты</label>
                <input
                  className="input w-full"
                  value={specialistsInvolved}
                  onChange={(e) => setSpecialistsInvolved(e.target.value)}
                  placeholder="ФИО, подразделение"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy} className="btn-primary !text-sm">
                  Зафиксировать протокол
                </button>
                <button
                  type="button"
                  className="btn-outline !text-sm"
                  onClick={() => setProtocolOpen(false)}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Collapsible
            title="Карточка гражданина"
            subtitle="ФИО, контакты и тема обращения"
            defaultOpen
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">ФИО</dt>
                <dd className="font-medium">{appeal.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Телефон</dt>
                <dd className="font-medium">{appeal.phone}</dd>
              </div>
              {appeal.email && (
                <div>
                  <dt className="text-xs text-slate-500">Email</dt>
                  <dd className="font-medium">{appeal.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Категория</dt>
                <dd className="font-medium">
                  {t.categories[appeal.category]}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Тема</dt>
                <dd className="font-medium">{appeal.topic}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Содержание</dt>
                <dd>{appeal.summary}</dd>
              </div>
            </dl>
          </Collapsible>

          {appeal.prepNotes && (
            <Collapsible title="Материалы подготовки" defaultOpen={false}>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {appeal.prepNotes}
              </p>
              {appeal.prepCompletedBy && (
                <p className="mt-2 text-xs text-slate-400">
                  {appeal.prepCompletedBy}
                  {appeal.prepCompletedAt &&
                    ` · ${new Date(appeal.prepCompletedAt).toLocaleString("ru-RU")}`}
                </p>
              )}
            </Collapsible>
          )}

          {appeal.receptionProtocol && (
            <Collapsible title="Протокол приёма" defaultOpen={false}>
              <dl className="space-y-3 text-sm">
                {appeal.receptionProtocol.citizenStatement?.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Заявление</dt>
                    <dd>{appeal.receptionProtocol.citizenStatement}</dd>
                  </div>
                ) : null}
                {appeal.receptionProtocol.leadershipExplanation?.trim() ? (
                  <div>
                    <dt className="text-xs text-slate-500">Разъяснение</dt>
                    <dd>{appeal.receptionProtocol.leadershipExplanation}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-500">Поручение</dt>
                  <dd>{appeal.receptionProtocol.assignmentText}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Ответственный</dt>
                  <dd>{appeal.receptionProtocol.responsibleName}</dd>
                </div>
                {appeal.assignment && (
                  <div>
                    <dt className="text-xs text-slate-500">Статус поручения</dt>
                    <dd className="font-medium">
                      {assignmentStatusLabel(appeal.assignment.status)}
                    </dd>
                  </div>
                )}
              </dl>
            </Collapsible>
          )}

          {appeal.finalAnswer && (
            <Collapsible
              title="Ответ гражданину"
              defaultOpen
              className="!border-emerald-200"
            >
              <p className="whitespace-pre-wrap text-sm">
                {appeal.finalAnswer}
              </p>
            </Collapsible>
          )}
        </div>

        <div className="space-y-3">
          <Collapsible
            title="Предыдущие обращения"
            defaultOpen={previous.length > 0}
            badge={<History className="h-4 w-4 text-slate-400" />}
          >
            <p className="mb-2 text-xs text-slate-500">{appeal.previousNotes}</p>
            {previous.length === 0 ? (
              <p className="text-sm text-slate-400">Нет связанных.</p>
            ) : (
              <ul className="space-y-2">
                {previous.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/appeals/${p.id}`}
                      className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <div className="font-mono font-semibold text-court-blue">
                        {p.code}
                      </div>
                      <div className="text-slate-500">{p.topic}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Collapsible>

          <Collapsible
            title="Журнал и уведомления"
            defaultOpen={false}
            badge={<Bell className="h-4 w-4 text-slate-400" />}
          >
            {appeal.controlLog.length > 0 && (
              <ul className="mb-4 max-h-40 space-y-2 overflow-y-auto text-xs">
                {[...appeal.controlLog].reverse().map((c) => (
                  <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="font-semibold">{c.action}</div>
                    <div className="text-slate-500">{c.comment}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {c.authorName} ·{" "}
                      {new Date(c.at).toLocaleString("ru-RU")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {[...appeal.notifications].reverse().map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-slate-100 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-800">{n.title}</div>
                    <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {n.channel === "email" ? "E-mail" : "система"}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-500">{n.body}</div>
                </li>
              ))}
            </ul>
          </Collapsible>

          {appointment && appointment.history.length > 0 && (
            <Collapsible title="История записи" defaultOpen={false}>
              <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                {[...appointment.history].reverse().map((h, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                    <div className="font-semibold">{h.action}</div>
                    {h.detail && (
                      <div className="text-slate-500">{h.detail}</div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-400">
                      {h.staffName ? `${h.staffName} · ` : ""}
                      {new Date(h.at).toLocaleString("ru-RU")}
                    </div>
                  </li>
                ))}
              </ul>
            </Collapsible>
          )}

          {appeal.feedback && (
            <Collapsible title="Оценка гражданина" defaultOpen>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Уважение: {appeal.feedback.respectful}/5</div>
                <div>Ясность: {appeal.feedback.clearNextSteps}/5</div>
                <div>Удобство: {appeal.feedback.convenient}/5</div>
                <div>Сроки: {appeal.feedback.deadlinesMet}/5</div>
              </div>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}
