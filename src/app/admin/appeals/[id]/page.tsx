"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bell,
  ClipboardList,
  History,
  UserCheck,
  Save,
  Ban,
  RotateCcw,
  UserX,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge, StatusBadge } from "@/components/ui/Badge";
import type { AppealCategory, AppealStage, AppointmentStatus } from "@/lib/types";
import { formatDateRu } from "@/lib/slots";
import { stageProgress, cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Collapsible } from "@/components/ui/Collapsible";
import { useI18n } from "@/lib/i18n";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { targetPerson, targetShort } from "@/lib/targets";
import { SlotPicker } from "@/components/booking/SlotPicker";

export default function AppealDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const {
    state,
    currentUser,
    startPrep,
    completePrep,
    getPreviousAppeals,
    staffCancelAppointment,
    staffRestoreAppointment,
    staffSetAppointmentStatus,
    staffRescheduleAppointment,
    staffUpdateCitizenData,
    staffSetAppealStage,
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

  const [summary, setSummary] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [category, setCategory] = useState<AppealCategory>("organization");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  // edit citizen
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [editCategory, setEditCategory] = useState<AppealCategory>("organization");

  // reschedule
  const [newDate, setNewDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [stageSelect, setStageSelect] = useState<AppealStage>("registered");
  const [statusSelect, setStatusSelect] = useState<AppointmentStatus>("confirmed");

  useEffect(() => {
    if (!appeal) return;
    setSummary(appeal.summary || "");
    setPrepNotes(appeal.prepNotes || "");
    setCategory(appeal.category);
    setEditCategory(appeal.category);
    setFullName(appeal.fullName);
    setPhone(appeal.phone);
    setEmail(appeal.email || "");
    setTopic(appeal.topic);
    setDescription(appeal.summary || "");
    setStageSelect(appeal.stage);
  }, [appeal?.id, appeal?.updatedAt]);

  useEffect(() => {
    if (!appointment) return;
    setNewDate(appointment.date);
    setNewSlotStart(appointment.slotStart);
    setNewSlotEnd(appointment.slotEnd);
    setStatusSelect(appointment.status);
  }, [appointment?.id, appointment?.updatedAt]);

  if (!appeal) {
    return (
      <div className="card p-8 text-center">
        <p className="text-court-muted">Карточка не найдена.</p>
        <Link href="/admin/appeals" className="btn-outline mt-4">
          К списку
        </Link>
      </div>
    );
  }

  const progress = stageProgress(appeal.stage);
  const canManage =
    !!currentUser &&
    ["reception", "admin", "leadership"].includes(currentUser.role);
  const canPrep =
    canManage &&
    ["registered", "under_review"].includes(appeal.stage) &&
    appointment?.status !== "pending_review" &&
    appointment?.status !== "rejected";

  function flash(ok: boolean, text: string) {
    setErr(!ok);
    setMsg(text);
  }

  async function onStartPrep() {
    if (!currentUser || !appeal) return;
    const res = await startPrep(appeal.id, currentUser);
    flash(
      Boolean(res?.ok),
      res?.ok
        ? "Переведено в предварительное изучение."
        : res?.error || "Не удалось сохранить"
    );
  }

  async function onCompletePrep(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appeal) return;
    const res = await completePrep(appeal.id, currentUser, {
      summary,
      prepNotes,
      category,
    });
    flash(
      Boolean(res?.ok),
      res?.ok
        ? "Подготовка завершена. Готово к личному приёму."
        : res?.error || "Не удалось сохранить"
    );
  }

  async function onSaveCitizen(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appointment) return;
    const res = await staffUpdateCitizenData(
      appointment.id,
      {
        fullName,
        phone,
        email,
        topic,
        category: editCategory,
        description,
      },
      currentUser
    );
    flash(res.ok, res.ok ? "Данные сохранены." : res.error);
  }

  async function onReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appointment) return;
    const res = await staffRescheduleAppointment(
      appointment.id,
      newDate,
      newSlotStart,
      newSlotEnd,
      currentUser
    );
    flash(res.ok, res.ok ? "Дата/время обновлены." : res.error);
  }

  async function onStage(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appeal) return;
    const res = await staffSetAppealStage(appeal.id, stageSelect, currentUser);
    flash(
      res.ok,
      res.ok
        ? `${isKy ? "Этап" : "Этап"}: ${t.stages[stageSelect]}`
        : res.error
    );
  }

  async function onStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !appointment) return;
    const res = await staffSetAppointmentStatus(
      appointment.id,
      statusSelect,
      currentUser
    );
    flash(
      res.ok,
      res.ok
        ? `${isKy ? "Жазылуу статусу" : "Статус записи"}: ${t.statuses[statusSelect]}`
        : res.error
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.appeals, href: "/admin/appeals" },
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
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reception" className="btn-outline !text-sm">
            Приём
          </Link>
          <Link href="/admin/control" className="btn-outline !text-sm">
            Контроль
          </Link>
          <Link href="/admin/calendar" className="btn-outline !text-sm">
            Календарь
          </Link>
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
          </div>
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

      {/* Quick actions — always visible */}
      {canManage && appointment && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Быстрые действия
          </h2>
          <div className="flex flex-wrap gap-2">
            {appointment.status !== "cancelled" &&
              appointment.status !== "completed" && (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    onClick={async () => {
                      if (!currentUser) return;
                      const r = await staffSetAppointmentStatus(
                        appointment.id,
                        "no_show",
                        currentUser
                      );
                      flash(r.ok, r.ok ? "Неявка" : r.error);
                    }}
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Неявка
                  </button>
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
                      flash(r.ok, r.ok ? "Отменено" : r.error);
                    }}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Отменить
                  </button>
                </>
              )}
            {(appointment.status === "cancelled" ||
              appointment.status === "no_show") && (
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
                    r.ok ? "Восстановлено → ожидание (регистрация)" : r.error
                  );
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Вернуть в ожидание
              </button>
            )}
            {appeal.stage === "registered" && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white hover:bg-court-navy/90"
                onClick={onStartPrep}
              >
                Начать подготовку
              </button>
            )}
            {appeal.stage === "ready_for_reception" && (
              <Link
                href="/admin/reception"
                className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white"
              >
                К приёму →
              </Link>
            )}
            {appeal.stage === "in_control" && (
              <Link
                href="/admin/control"
                className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-3 py-2 text-xs font-semibold text-white"
              >
                К контролю →
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Collapsible
            title="Карточка гражданина"
            subtitle="ФИО, контакты, тема — можно править"
            defaultOpen
            badge={
              <ClipboardList className="h-4 w-4 text-slate-400" />
            }
          >
            {canManage && appointment ? (
              <form onSubmit={onSaveCitizen} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      ФИО
                    </span>
                    <input
                      className="input w-full"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      Телефон
                    </span>
                    <input
                      className="input w-full"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      Email
                    </span>
                    <input
                      className="input w-full"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      Категория
                    </span>
                    <select
                      className="input w-full"
                      value={editCategory}
                      onChange={(e) =>
                        setEditCategory(e.target.value as AppealCategory)
                      }
                    >
                      {(Object.keys(t.categories) as AppealCategory[]).map(
                        (k) => (
                          <option key={k} value={k}>
                            {t.categories[k]}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Тема
                    </span>
                    <input
                      className="input w-full"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Содержание / описание
                    </span>
                    <textarea
                      className="input min-h-[72px] w-full"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </label>
                </div>
                <button type="submit" className="btn-primary !text-sm">
                  <Save className="h-4 w-4" />
                  Сохранить данные
                </button>
              </form>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Тема</dt>
                  <dd className="font-medium">{appeal.topic}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Категория</dt>
                  <dd className="font-medium">
                    {t.categories[appeal.category]}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Содержание</dt>
                  <dd>{appeal.summary}</dd>
                </div>
              </dl>
            )}
          </Collapsible>

          {canManage && appointment && (
            <Collapsible
              title="Дата, время и статусы"
              subtitle="Перенос · статус записи · этап пайплайна"
              defaultOpen
            >
              <div className="space-y-5">
                <form onSubmit={onReschedule} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Перенос приёма
                  </h3>
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
                  <button type="submit" className="btn-outline !text-sm">
                    Перенести
                  </button>
                </form>

                <form
                  onSubmit={onStatus}
                  className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
                >
                  <label className="block min-w-[180px] flex-1 space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Статус записи
                    </span>
                    <select
                      className="input w-full"
                      value={statusSelect}
                      onChange={(e) =>
                        setStatusSelect(e.target.value as AppointmentStatus)
                      }
                    >
                      {(
                        Object.keys(t.statuses) as AppointmentStatus[]
                      ).map((k) => (
                        <option key={k} value={k}>
                          {t.statuses[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="btn-outline !text-sm">
                    Применить статус
                  </button>
                </form>

                <form
                  onSubmit={onStage}
                  className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
                >
                  <label className="block min-w-[220px] flex-1 space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Этап обращения
                    </span>
                    <select
                      className="input w-full"
                      value={stageSelect}
                      onChange={(e) =>
                        setStageSelect(e.target.value as AppealStage)
                      }
                    >
                      {(Object.keys(t.stages) as AppealStage[]).map(
                        (k) => (
                          <option key={k} value={k}>
                            {t.stages[k]}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <button type="submit" className="btn-outline !text-sm">
                    Сменить этап
                  </button>
                </form>
              </div>
            </Collapsible>
          )}

          {canPrep && (
            <Collapsible
              title="Этап 2 · Подготовка"
              subtitle="Предварительное изучение для руководства"
              defaultOpen={appeal.stage === "under_review"}
              badge={<UserCheck className="h-4 w-4 text-slate-400" />}
            >
              {appeal.stage === "registered" && (
                <button
                  type="button"
                  className="btn-primary mb-4 !text-sm"
                  onClick={onStartPrep}
                >
                  Начать изучение
                </button>
              )}
              <form onSubmit={onCompletePrep} className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Категория
                  </span>
                  <select
                    className="input w-full"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as AppealCategory)
                    }
                  >
                    {(Object.keys(t.categories) as AppealCategory[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {t.categories[k]}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Краткое содержание (для руководства)
                  </span>
                  <textarea
                    className="input min-h-[72px] w-full"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Заметки подготовки
                  </span>
                  <textarea
                    className="input min-h-[88px] w-full"
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn-gold !text-sm">
                  Завершить подготовку
                </button>
              </form>
            </Collapsible>
          )}

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
                <div>
                  <dt className="text-xs text-slate-500">Заявление</dt>
                  <dd>{appeal.receptionProtocol.citizenStatement}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Разъяснение</dt>
                  <dd>{appeal.receptionProtocol.leadershipExplanation}</dd>
                </div>
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
                    <dd className="font-medium">{appeal.assignment.status}</dd>
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
                {appeal.controlLog.map((c) => (
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
              {appeal.notifications.map((n) => (
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
