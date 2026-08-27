"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ClipboardCheck,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { Modal } from "@/components/ui/Modal";
import {
  AdminPagination,
  usePagedList,
} from "@/components/ui/AdminPagination";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  ASSIGNMENT_STATUSES,
  assignmentStatusLabel,
} from "@/lib/assignment";
import type { AssignmentStatus } from "@/lib/types";
import { EllipsisText } from "@/components/ui/EllipsisText";
import { ReportPanel } from "@/components/staff/ReportPanel";
import { can } from "@/lib/acl";

export default function ControlPage() {
  const {
    state,
    currentUser,
    addControlLog,
    setAssignmentStatus,
    submitFinalAnswer,
    assignAppeal,
  } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "done">("all");
  const [q, setQ] = useState("");
  const [statusPick, setStatusPick] = useState<AssignmentStatus>("assigned");
  const [comment, setComment] = useState("");
  const [answer, setAnswer] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [assignText, setAssignText] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  const canAssign =
    currentUser?.role === "leadership" || currentUser?.role === "admin";
  const today = new Date().toISOString().slice(0, 10);

  const items = useMemo(() => {
    let list = state.appeals.filter((a) =>
      ["in_control", "reception_done", "closed"].includes(a.stage)
    );
    if (currentUser?.role === "responsible") {
      list = list.filter((a) => a.assignment?.responsibleUserId === currentUser.id);
    }
    if (filter === "open") {
      list = list.filter(
        (a) => a.stage === "in_control" && a.assignment && a.assignment.status !== "done"
      );
    }
    if (filter === "overdue") {
      list = list.filter(
        (a) =>
          a.stage === "in_control" &&
          a.assignment?.dueDate &&
          a.assignment.dueDate < today &&
          a.assignment.status !== "done"
      );
    }
    if (filter === "done") {
      list = list.filter(
        (a) => a.stage === "closed" || a.assignment?.status === "done"
      );
    }
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((a) => {
        const hay = [
          a.code,
          a.fullName,
          a.topic,
          a.assignment?.responsibleName,
          a.assignment?.text,
          assignmentStatusLabel(a.assignment?.status, false),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
    }
    // Новые сверху; просроченные в фильтре «все/в работе» поднимаем выше
    return [...list].sort((a, b) => {
      if (filter === "all" || filter === "open") {
        const ao =
          a.stage === "in_control" &&
          a.assignment?.dueDate &&
          a.assignment.dueDate < today &&
          a.assignment.status !== "done"
            ? 0
            : 1;
        const bo =
          b.stage === "in_control" &&
          b.assignment?.dueDate &&
          b.assignment.dueDate < today &&
          b.assignment.status !== "done"
            ? 0
            : 1;
        if (ao !== bo) return ao - bo;
      }
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
  }, [state.appeals, currentUser, filter, today, q]);

  const { page, setPage, totalPages, slice, total, pageSize } =
    usePagedList(items);

  const selected = items.find((a) => a.id === selectedId);
  // "responsible" ведёт только свои поручения; "leadership" — тоже только
  // свои, и только те, что назначил себе через «Исполнить самому» на
  // карточке (обычно поручает "responsible", а не ведёт сам). Admin — любые.
  const isOwnAssignment =
    currentUser?.role === "admin" ||
    (!!currentUser && selected?.assignment?.responsibleUserId === currentUser.id);
  const canChangeStatus =
    can(currentUser, "changeAssignmentStatus") && isOwnAssignment;
  const canAnswer = can(currentUser, "changeAssignmentStatus") && isOwnAssignment;

  useEffect(() => {
    const st = selected?.assignment?.status;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подгрузка формы при выборе/обновлении поручения
    if (st && st !== "not_assigned") setStatusPick(st);
    setAssignTo(selected?.assignment?.responsibleUserId || "");
    setAssignText(selected?.assignment?.text || "");
  }, [selected?.id, selected?.assignment?.status, selected?.assignment?.responsibleUserId, selected?.assignment?.text]);

  const counts = useMemo(() => {
    let base = state.appeals.filter((a) =>
      ["in_control", "reception_done", "closed"].includes(a.stage)
    );
    if (currentUser?.role === "responsible") {
      base = base.filter((a) => a.assignment?.responsibleUserId === currentUser.id);
    }
    const open = base.filter(
      (a) => a.stage === "in_control" && a.assignment && a.assignment.status !== "done"
    ).length;
    const overdue = base.filter(
      (a) =>
        a.stage === "in_control" &&
        a.assignment?.dueDate &&
        a.assignment.dueDate < today &&
        a.assignment.status !== "done"
    ).length;
    const done = base.filter(
      (a) => a.stage === "closed" || a.assignment?.status === "done"
    ).length;
    return { open, overdue, done, all: base.length };
  }, [state.appeals, currentUser, today]);

  function openItem(id: string) {
    setSelectedId(id);
    setMsg("");
    setAnswer("");
    setComment("");
  }

  async function onStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !selected) return;
    const rec = await setAssignmentStatus(selected.id, statusPick);
    if (rec && "ok" in rec && !rec.ok) {
      setErr(true);
      setMsg(rec.error);
      return;
    }
    if (comment.trim()) {
      await addControlLog(
        selected.id,
        currentUser,
        assignmentStatusLabel(statusPick, isKy),
        comment.trim()
      );
      setComment("");
    }
    setErr(false);
    setSelectedId("");
  }

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const resp = state.staff.find((s) => s.id === assignTo);
    if (!resp || !assignText.trim()) {
      setErr(true);
      setMsg(L("Укажите исполнителя (ФИО) и текст поручения.", "Аткаруучуну жана текстти көрсөтүңүз."));
      return;
    }
    const rec = await assignAppeal(selected.id, resp.id, resp.fullName, assignText.trim());
    if (rec && "ok" in rec && !rec.ok) {
      setErr(true);
      setMsg(rec.error);
      return;
    }
    setErr(false);
    setSelectedId("");
  }

  async function onAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !selected) return;
    const sent = await submitFinalAnswer(selected.id, currentUser, answer);
    if (sent && "ok" in sent && !sent.ok) {
      setErr(true);
      setMsg(sent.error);
      return;
    }
    setAnswer("");
    setErr(false);
    setSelectedId("");
  }

  const reportScope = useMemo(() => {
    let appeals = state.appeals.filter((a) =>
      ["in_control", "reception_done", "closed"].includes(a.stage)
    );
    if (currentUser?.role === "responsible") {
      appeals = appeals.filter(
        (a) => a.assignment?.responsibleUserId === currentUser.id
      );
    }
    const aptIds = new Set(appeals.map((a) => a.appointmentId));
    const appointments = state.appointments.filter((a) => aptIds.has(a.id));
    return { appeals, appointments };
  }, [state.appeals, state.appointments, currentUser]);

  function isOverdue(a: (typeof items)[number]) {
    if (!a.assignment) return false;
    return (
      a.stage === "in_control" && a.assignment.dueDate < today && a.assignment.status !== "done"
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.control },
        ]}
      />
      <AdminHeading
        title={isKy ? "Тапшырмалар" : "Поручения"}
        lead={L(
          "Список поручений с указанием исполнителя и статуса исполнения.",
          "Аткаруучунун ФИО жана аткаруу статусу көрсөтүлгөн тапшырмалардын тизмеси."
        )}
      />

      <ReportPanel
        appeals={reportScope.appeals}
        appointments={reportScope.appointments}
        serviceContent={state.serviceContent}
        isKy={isKy}
        lang={lang === "ky" ? "ky" : "ru"}
        orgName={t.orgName}
        reportTitle={
          isKy ? "Тапшырмалар боюнча отчёт" : "Отчёт по поручениям"
        }
        reportSubtitle={
          currentUser?.role === "responsible"
            ? isKy
              ? "Менин тапшырмаларым"
              : "Поручения, назначенные вам"
            : isKy
              ? "Башкаруудагы тапшырмалар"
              : "Поручения на контроле"
        }
        search={
          <div className="relative w-44 shrink-0 sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="input !h-9 pl-8 !text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L("Поиск…", "Издөө…")}
            />
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-4">
        {(
          [
            { key: "all" as const, label: L("Все", "Баары"), n: counts.all, icon: ClipboardCheck },
            { key: "open" as const, label: L("В работе", "Ачык"), n: counts.open, icon: Clock },
            { key: "overdue" as const, label: L("Просрочено", "Мөөнөтү өткөн"), n: counts.overdue, icon: AlertTriangle },
            { key: "done" as const, label: L("Завершено", "Аякталды"), n: counts.done, icon: CheckCircle2 },
          ] as const
        ).map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                filter === c.key
                  ? "border-court-navy bg-court-navy text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", filter === c.key ? "text-white/90" : "text-slate-400")} />
              <div>
                <div className="text-xs opacity-80">{c.label}</div>
                <div className="text-xl font-semibold tabular-nums">{c.n}</div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        {items.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={L("Нет поручений", "Бош")}
            description={
              q.trim()
                ? L("Ничего не найдено по запросу.", "Издөө боюнча табылган жок.")
                : L(
                    "После личного приёма или поручения обращения появятся здесь.",
                    "Жеке кабыл алуудан кийин бул жерде пайда болот."
                  )
            }
            className="border-0 shadow-none"
          />
        ) : (
          <>
            <ul className="space-y-2">
              {slice.map((a) => {
                const overdue = isOverdue(a);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => openItem(a.id)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition",
                        overdue
                          ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <EllipsisText
                          text={a.fullName}
                          className="min-w-0 font-semibold text-slate-900"
                        />
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {overdue && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                              {L("Просрочка", "Мөөнөт")}
                            </span>
                          )}
                          <StageBadge stage={a.stage} />
                        </div>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <EllipsisText
                          text={`${a.assignment?.responsibleName || "—"} · ${L("срок", "мөөнөт")} ${a.assignment?.dueDate || "—"}${
                            a.assignment?.status
                              ? ` · ${assignmentStatusLabel(a.assignment.status, isKy)}`
                              : ""
                          }`}
                        />
                      </div>
                      <EllipsisText
                        text={a.topic}
                        className="mt-0.5 text-xs text-slate-400"
                        as="div"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <AdminPagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              isKy={isKy}
              className="mt-3 rounded-lg border border-slate-100"
            />
          </>
        )}
      </section>

      {selected && (
        <Modal
          title={selected.code}
          subtitle={selected.topic}
          onClose={() => setSelectedId("")}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950">
                <strong>{L("Поручение:", "Тапшырма:")}</strong>{" "}
                {selected.assignment?.text || "—"}
              </div>
              <Link
                href={`/admin/appeals/${selected.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-court-blue hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {L("Карточка", "Карточка")}
              </Link>
            </div>

            {msg && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  err
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                )}
              >
                {msg}
              </div>
            )}

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {L("Исполнитель", "Аткаруучу")}: {selected.assignment?.responsibleName || "—"} ·{" "}
              {L("статус", "статус")}:{" "}
              {assignmentStatusLabel(selected.assignment?.status, isKy)}
            </div>

            {canAssign && selected.stage === "in_control" && (
              <form onSubmit={onAssign} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold text-slate-600">
                  {L("Назначить исполнителя (ФИО)", "Аткаруучуну дайындоо")}
                </div>
                <select
                  className="input w-full"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  required
                  title={
                    state.staff.find((s) => s.id === assignTo)?.fullName ||
                    undefined
                  }
                >
                  <option value="">{L("Выберите сотрудника", "Кызматкерди тандаңыз")}</option>
                  {state.staff
                    .filter((s) => s.role === "responsible" || s.role === "leadership")
                    .map((s) => (
                      <option key={s.id} value={s.id} title={`${s.fullName} — ${s.position}`}>
                        {s.fullName} — {s.position}
                      </option>
                    ))}
                </select>
                <textarea
                  className="input min-h-[64px] w-full"
                  value={assignText}
                  onChange={(e) => setAssignText(e.target.value)}
                  placeholder={L("Содержание поручения", "Тапшырманын тексти")}
                  required
                />
                <button type="submit" className="btn-primary !text-sm">
                  {L("Назначить", "Дайындоо")}
                </button>
              </form>
            )}

            {canChangeStatus && selected.stage === "in_control" && (
              <form onSubmit={onStatus} className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {L("Статус поручения", "Тапшырманын статусу")}
                  </span>
                  {/*
                    "Исполнено" сюда не входит: этот статус выставляется
                    автоматически при сохранении протокола (см. onAnswer) —
                    он означает, что гражданину действительно отправлен
                    ответ, а не просто "я закончил" по собственной оценке.
                  */}
                  <select
                    className="input w-full"
                    value={statusPick}
                    onChange={(e) => setStatusPick(e.target.value as AssignmentStatus)}
                  >
                    {ASSIGNMENT_STATUSES.filter(
                      (s) => s.key !== "not_assigned" && s.key !== "done"
                    ).map((st) => (
                      <option key={st.key} value={st.key}>
                        {isKy ? st.ky : st.ru}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {L("Комментарий (необязательно)", "Комментарий (милдеттүү эмес)")}
                  </span>
                  <textarea
                    className="input min-h-[70px] w-full"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn-outline !text-sm">
                  {L("Сохранить статус", "Статусту сактоо")}
                </button>
              </form>
            )}

            {canAnswer && selected.stage !== "closed" && (
              <form onSubmit={onAnswer} className="space-y-3 border-t border-slate-100 pt-4">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {L("Протокол исполнения", "Аткаруу протоколу")}
                  </span>
                  <textarea
                    className="input min-h-[100px] w-full"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={L("Текст протокола / обоснованного ответа…", "Протоколдун тексти…")}
                  />
                </label>
                <button type="submit" className="btn-primary !text-sm">
                  {L("Сохранить протокол и завершить", "Протоколду сактап, аяктоо")}
                </button>
              </form>
            )}

            {selected.controlLog.length > 0 && (
              <ul className="max-h-36 space-y-2 overflow-y-auto border-t border-slate-100 pt-3 text-xs">
                {[...selected.controlLog].reverse().map((c) => (
                  <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <strong>{c.action}</strong> {c.comment && `— ${c.comment}`}
                    <div className="text-slate-400">
                      {c.authorName} · {new Date(c.at).toLocaleString("ru-RU")}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selected.stage === "closed" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {L("Обращение завершено.", "Кайрылуу аяктады.")}{" "}
                <Link href={routes.evaluationByCode(selected.code)} className="font-semibold underline">
                  {routes.evaluationByCode(selected.code)}
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
