"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { VisitTicket } from "@/components/booking/VisitTicket";
import { StatusBadge } from "@/components/ui/Badge";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { formatDateRu, weekdayRu } from "@/lib/slots";
import type { Appointment, AppealCard } from "@/lib/types";
import {
  CalendarClock,
  CalendarPlus,
  History,
  Printer,
  Search,
  Star,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Panel = "find" | "details" | "reschedule" | "history" | "appeal";

const STORAGE_KEY = "vs-kr-my-booking";

export default function MyAppointmentPage() {
  const {
    ready,
    findAppointment,
    cancelAppointment,
    rescheduleAppointment,
    state,
  } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [apt, setApt] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<Panel>("find");
  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [remember, setRemember] = useState(true);
  const autoLookupDone = useRef(false);
  // Код/PIN, восстановленные из URL или localStorage при загрузке страницы —
  // отдельно от полей формы, чтобы автопоиск ниже не срабатывал во время
  // обычного ручного набора кода и PIN гражданином.
  const restoredRef = useRef<{ code: string; pin: string } | null>(null);

  useEffect(() => {
    const fromUrl =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("code")
        : null;
    let restoredCode = "";
    let restoredPin = "";
    if (fromUrl) {
      restoredCode = fromUrl.trim().toUpperCase();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- код записи читаем из URL/localStorage только на клиенте
      setCode(restoredCode);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { code?: string; pin?: string };
        if (!fromUrl && data.code) {
          restoredCode = data.code;
          setCode(data.code);
        }
        if (data.pin) {
          restoredPin = data.pin;
          setPin(data.pin);
        }
      }
    } catch {
      /* ignore */
    }
    restoredRef.current = { code: restoredCode, pin: restoredPin };
  }, []);

  // Восстанавливаем открытую запись после обновления страницы (F5): код и
  // PIN уже сохранены локально (см. эффект выше), поэтому не заставляем
  // гражданина вводить их повторно — как только стор готов, ищем запись сами
  // и сразу открываем карточку, если она нашлась. Используем именно
  // restoredRef (а не live-состояние полей формы), чтобы это не срабатывало
  // при обычном ручном вводе кода/PIN.
  useEffect(() => {
    if (!ready || autoLookupDone.current) return;
    const restored = restoredRef.current;
    if (!restored || !restored.code.trim() || !restored.pin.trim()) return;
    autoLookupDone.current = true;
    (async () => {
      const found = await findAppointment(restored.code, restored.pin);
      if (found) {
        setApt(found);
        setPanel("details");
      }
    })();
  }, [ready, findAppointment]);

  if (!ready) {
    return <PageLoader label={t.common.loading} />;
  }

  const appeal: AppealCard | undefined = apt
    ? state.appeals.find((a) => a.appointmentId === apt.id)
    : undefined;

  async function refresh() {
    const found = await findAppointment(code, pin);
    setApt(found);
    return found;
  }

  function persist(c: string, p: string) {
    if (!remember) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: c, pin: p }));
  }

  async function onFind(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const found = await findAppointment(code, pin);
    if (!found) {
      setApt(null);
      setError(
        isKy
          ? "Жазылуу табылган жок. Код жана PIN-ди текшериңиз."
          : "Запись не найдена. Проверьте код и PIN."
      );
      setPanel("find");
      return;
    }
    setApt(found);
    persist(code.trim().toUpperCase(), pin.trim());
    setPanel("details");
  }

  async function onCancel() {
    if (!apt) return;
    if (
      !confirm(
        isKy
          ? "Жазылууну жокко чыгаруу? Слот бошотулат."
          : "Отменить запись? Интервал времени будет освобождён для других заявителей."
      )
    )
      return;
    const res = await cancelAppointment(code, pin);
    if (!res.ok) {
      setError(res.error || "Ошибка");
      return;
    }
    setMessage(
      isKy ? "Жазылуу жокко чыгарылды." : "Запись отменена."
    );
    setApt(await refresh());
    setPanel("details");
  }

  async function onReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!apt) return;
    const res = await rescheduleAppointment(code, pin, date, slotStart, slotEnd);
    if (!res.ok) {
      setError(res.error || (isKy ? "Которулган жок" : "Не удалось перенести"));
      return;
    }
    setMessage(
      isKy
        ? `Жазылуу которулду: ${formatDateRu(date)}, ${slotStart}–${slotEnd}.`
        : `Запись перенесена на ${formatDateRu(date)}, ${slotStart}–${slotEnd}.`
    );
    setApt(await refresh());
    setPanel("details");
    setDate("");
    setSlotStart("");
    setSlotEnd("");
  }

  const canManage =
    apt &&
    apt.status !== "cancelled" &&
    apt.status !== "accepted" &&
    apt.status !== "completed" &&
    apt.status !== "rejected";
  const canReschedule =
    canManage && apt.status !== "pending_review";

  const modules = [
    {
      id: "details" as const,
      label: isKy ? "Жазылуу" : "Запись",
      icon: Search,
      show: !!apt,
    },
    {
      id: "appeal" as const,
      label: isKy ? "Кайрылуу" : "Обращение",
      icon: History,
      show: !!apt && !!appeal,
    },
    {
      id: "reschedule" as const,
      label: isKy ? "Которуу" : "Перенос",
      icon: CalendarClock,
      show: !!canReschedule,
    },
    {
      id: "history" as const,
      label: isKy ? "Тарых" : "История",
      icon: History,
      show: !!apt,
    },
  ];

  return (
    <div className="print-ticket-root mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <Breadcrumbs
        items={[
          { label: t.crumbs.home, href: "/" },
          { label: t.crumbs.my },
        ]}
      />
      <div className="mb-6 max-w-2xl">
        <h1 className="section-title">{t.my.title}</h1>
        <p className="mt-2 text-base text-court-muted">{t.my.lead}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-3 lg:sticky lg:top-36 lg:self-start">
          <div className="card p-2">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              <button
                type="button"
                onClick={() => {
                  setPanel("find");
                  setError("");
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 px-3 py-2.5 text-left text-sm font-medium",
                  panel === "find"
                    ? "bg-court-blue text-white"
                    : "text-court-muted hover:bg-court-mist"
                )}
              >
                <Search className="h-4 w-4" />
                {isKy ? "Издөө" : "Найти"}
              </button>
              {modules
                .filter((m) => m.show)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPanel(m.id);
                      setError("");
                      setMessage("");
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 px-3 py-2.5 text-left text-sm font-medium",
                      panel === m.id
                        ? "bg-court-blue text-white"
                        : "text-court-muted hover:bg-court-mist"
                    )}
                  >
                    <m.icon className="h-4 w-4" />
                    {m.label}
                  </button>
                ))}
            </nav>
          </div>

          <Link
            href={routes.appointment}
            className="card flex items-center gap-3 p-4 transition hover:border-court-blue"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-court-light text-court-blue">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-court-ink">
                {t.my.newBook}
              </div>
              <div className="text-xs text-court-muted">
                {isKy ? "Электрондук жазылуу" : "Электронная запись"}
              </div>
            </div>
          </Link>

          {apt && (
            <Link
              href={routes.evaluationByCode(apt.code)}
              className="card flex items-center gap-3 border-court-gold/40 p-4 transition hover:border-court-gold"
            >
              <div className="flex h-10 w-10 items-center justify-center bg-court-goldPale text-court-ink">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-court-ink">
                  {isKy ? "Сервисти баалоо" : "Оценить сервис"}
                </div>
                <div className="text-xs text-court-muted">
                  {isKy
                    ? "Онлайн-жазылуу жана кабыл алуу"
                    : "Онлайн-запись и работа приёмной"}
                  {appeal?.feedback
                    ? isKy
                      ? " · өзгөртүү"
                      : " · изменить"
                    : ""}
                </div>
              </div>
            </Link>
          )}
        </aside>

        <div className="min-w-0 space-y-4">
          {error && (
            <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          )}
          {message && (
            <div className="border border-court-line bg-court-mist px-4 py-3 text-sm text-court-ink">
              {message}
            </div>
          )}

          {(panel === "find" || !apt) && (
            <form onSubmit={onFind} className="card p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-court-ink">
                {t.my.find}
              </h2>
              <p className="mt-1 text-sm text-court-muted">{t.my.findLead}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="code">
                    {t.my.code}
                  </label>
                  <input
                    id="code"
                    className="input !min-h-11 font-mono uppercase"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VS-2026-...."
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pin">
                    {t.my.pin}
                  </label>
                  <input
                    id="pin"
                    className="input !min-h-11 font-mono"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={isKy ? "4 сан" : "4 цифры"}
                    required
                  />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-court-muted">
                <input
                  type="checkbox"
                  className="accent-court-blue"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                {isKy
                  ? "Бул браузерде сактоо (код жана PIN)"
                  : "Запомнить в этом браузере (код и PIN)"}
              </label>
              <button type="submit" className="btn-primary mt-4">
                <Search className="h-4 w-4" />
                {t.common.search}
              </button>
            </form>
          )}

          {apt && panel === "details" && (
            <div className="space-y-4">
              {apt.status === "pending_review" && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                  {isKy
                    ? "Өтүнмө кароодо. Жазылуу ырасталгандан кийин гана күчүнө кирет. Жылдыруу ырастоодон кийин жеткиликтүү."
                    : "Заявка находится на рассмотрении. Запись вступает в силу после подтверждения. Перенос доступен после подтверждения."}
                </div>
              )}
              {apt.status === "rejected" && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  {isKy
                    ? "Өтүнмө ырасталган жок."
                    : "В записи отказано."}
                  {apt.reviewNote ? ` ${apt.reviewNote}` : ""}
                </div>
              )}
              {apt.status !== "pending_review" &&
                apt.status !== "rejected" &&
                apt.reviewNote && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                    <span className="font-semibold">
                      {isKy ? "Ырастоо эскертмеси" : "Заметка при подтверждении"}:
                    </span>{" "}
                    {apt.reviewNote}
                  </div>
                )}
              <VisitTicket
                code={apt.code}
                pin={apt.pin}
                fullName={apt.fullName}
                date={apt.date}
                slotStart={apt.slotStart}
                slotEnd={apt.slotEnd}
                targetId={apt.targetId}
                pending={apt.status === "pending_review"}
                isKy={isKy}
              />
          {apt && appeal && appeal.notifications.length > 0 && (
            <div className="rounded-lg border border-court-line bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-court-muted">
                {isKy ? "Уведомления" : "Уведомления по заявке"}
              </div>
              <ul className="mt-2 space-y-2">
                {[...appeal.notifications].reverse().map((n) => (
                  <li key={n.id} className="text-sm text-court-ink">
                    <div className="font-semibold">{n.title}</div>
                    <p className="mt-0.5 text-xs text-court-muted">{n.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
            <div className="card p-5 sm:p-6" id="my-slip">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-sm text-court-muted">
                    {apt.code}
                  </div>
                  <h2 className="text-2xl font-semibold text-court-ink">
                    {apt.fullName}
                  </h2>
                  <p className="mt-1 text-sm text-court-muted">{apt.topic}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>

              <div className="mt-5 grid gap-3 border border-court-line bg-court-mist p-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-court-muted">
                    {isKy ? "Күн" : "Дата"}
                  </div>
                  <div className="font-semibold text-court-ink">
                    {formatDateRu(apt.date)} ({weekdayRu(apt.date)})
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-court-muted">
                    {isKy ? "Убакыт" : "Время"}
                  </div>
                  <div className="font-semibold text-court-ink">
                    {apt.slotStart} – {apt.slotEnd}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-court-muted">
                    {t.book.phone}
                  </div>
                  <div className="font-semibold text-court-ink">{apt.phone}</div>
                </div>
                {appeal && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-court-muted">
                      {isKy ? "Этап" : "Этап обращения"}
                    </div>
                    <div className="font-semibold text-court-ink">
                      {t.stages[appeal.stage] || appeal.stage}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-court-line pt-5 no-print">
                {canManage && (
                  <>
                    {canReschedule && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setPanel("reschedule")}
                    >
                      <CalendarClock className="h-4 w-4" />
                      {t.my.reschedule}
                    </button>
                    )}
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={onCancel}
                    >
                      <XCircle className="h-4 w-4" />
                      {t.my.cancelAppt}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  {t.common.print}
                </button>
                {appeal && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setPanel("appeal")}
                  >
                    {isKy ? "Кайрылуунун абалы" : "Статус обращения"}
                  </button>
                )}
              </div>
            </div>
            </div>
          )}

          {apt && panel === "appeal" && appeal && (
            <div className="card p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-court-ink">
                {isKy ? "Кайрылуунун абалы" : "Статус обращения"}
              </h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase text-court-muted">
                    {isKy ? "Кайрылуучу" : "Заявитель"}
                  </dt>
                  <dd className="font-semibold text-court-ink">
                    {appeal.fullName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-court-muted">
                    {t.book.phone}
                  </dt>
                  <dd className="font-semibold text-court-ink">{appeal.phone}</dd>
                </div>
                {appeal.email ? (
                  <div>
                    <dt className="text-xs uppercase text-court-muted">
                      {isKy ? "Электрондук почта" : "Электронная почта"}
                    </dt>
                    <dd className="font-semibold text-court-ink">
                      {appeal.email}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase text-court-muted">
                    {isKy ? "Этап" : "Этап"}
                  </dt>
                  <dd className="font-semibold text-court-ink">
                    {t.stages[appeal.stage]}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase text-court-muted">
                    {isKy ? "Тема" : "Тема"}
                  </dt>
                  <dd className="font-semibold text-court-ink">{appeal.topic}</dd>
                </div>
                {appeal.summary ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase text-court-muted">
                      {isKy ? "Мазмуну" : "Содержание"}
                    </dt>
                    <dd className="mt-0.5 text-court-ink">{appeal.summary}</dd>
                  </div>
                ) : null}
              </dl>
              {appeal.finalAnswer && (
                <div className="mt-4 border border-court-line bg-court-mist p-4 text-sm">
                  <div className="text-xs uppercase text-court-muted">
                    {isKy ? "Жооп" : "Ответ"}
                  </div>
                  <p className="mt-1 text-court-ink">{appeal.finalAnswer}</p>
                </div>
              )}
              {appeal.assignment && (
                <div className="mt-4 border border-court-line p-4 text-sm">
                  <div className="text-xs uppercase text-court-muted">
                    {isKy ? "Тапшырма" : "Поручение"}
                  </div>
                  <p className="mt-1 text-court-ink">{appeal.assignment.text}</p>
                  <p className="mt-1 text-court-muted">
                    {appeal.assignment.responsibleName} ·{" "}
                    {appeal.assignment.status}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="btn-outline mt-4"
                onClick={() => setPanel("details")}
              >
                {t.common.back}
              </button>
            </div>
          )}

          {apt && panel === "reschedule" && canReschedule && (
            <form onSubmit={onReschedule} className="card space-y-4 p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-court-ink">
                {t.my.rescheduleTitle}
              </h2>
              <p className="text-sm text-court-muted">
                {t.my.rescheduleLead}: {formatDateRu(apt.date)}, {apt.slotStart}
                –{apt.slotEnd}.
              </p>
              <SlotPicker
                date={date}
                slotStart={slotStart}
                onDateChange={setDate}
                onSlotChange={(s, e) => {
                  setSlotStart(s);
                  setSlotEnd(e);
                }}
                excludeAppointmentId={apt.id}
                targetId={apt.targetId}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!date || !slotStart}
                >
                  {t.my.saveSlot}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setPanel("details")}
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          )}

          {apt && panel === "history" && (
            <div className="card p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-court-ink">
                {t.my.history}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-court-muted">
                {[...apt.history].reverse().map((h, i) => (
                  <li
                    key={i}
                    className="border border-court-line bg-white px-3 py-2"
                  >
                    <span className="font-medium text-court-ink">{h.action}</span>
                    {h.detail && <> — {h.detail}</>}
                    <div className="mt-1 text-xs text-court-muted">
                      {new Date(h.at).toLocaleString("ru-RU")}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
