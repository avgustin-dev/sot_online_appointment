"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ACTION_PRESETS = [
  { ru: "Ход исполнения", ky: "Аткаруунун жүрүшү" },
  { ru: "Запрос документов", ky: "Документтерди суроо" },
  { ru: "Согласование", ky: "Макулдашуу" },
  { ru: "Напоминание ответственному", ky: "Жооптууга эскертүү" },
  { ru: "Частичное исполнение", ky: "Жарым-жартылай аткаруу" },
  { ru: "Готово к ответу", ky: "Жоопко даяр" },
];

export default function ControlPage() {
  const {
    state,
    currentUser,
    addControlLog,
    setAssignmentStatus,
    submitFinalAnswer,
  } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "done">("all");
  const [action, setAction] = useState(ACTION_PRESETS[0].ru);
  const [comment, setComment] = useState("");
  const [answer, setAnswer] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  const readOnly = currentUser?.role === "leadership" || currentUser?.role === "admin";
  const today = new Date().toISOString().slice(0, 10);

  const items = useMemo(() => {
    let list = state.appeals.filter((a) =>
      ["in_control", "answered", "reception_done", "closed"].includes(a.stage)
    );
    if (currentUser?.role === "responsible") {
      list = list.filter((a) => a.assignment?.responsibleUserId === currentUser.id);
    }
    list = list.sort((a, b) => {
      const da = a.assignment?.dueDate || "9999";
      const db = b.assignment?.dueDate || "9999";
      return da.localeCompare(db);
    });
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
        (a) => a.stage === "answered" || a.stage === "closed" || a.assignment?.status === "done"
      );
    }
    return list;
  }, [state.appeals, currentUser, filter, today]);

  const selected = items.find((a) => a.id === selectedId);

  const counts = useMemo(() => {
    let base = state.appeals.filter((a) =>
      ["in_control", "answered", "reception_done", "closed"].includes(a.stage)
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
      (a) => a.stage === "answered" || a.stage === "closed" || a.assignment?.status === "done"
    ).length;
    return { open, overdue, done, all: base.length };
  }, [state.appeals, currentUser, today]);

  function openItem(id: string) {
    setSelectedId(id);
    setMsg("");
    setAnswer("");
    setComment("");
  }

  async function onLog(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !selected) return;
    const rec = await addControlLog(selected.id, currentUser, action, comment);
    if (rec && "ok" in rec && !rec.ok) {
      setErr(true);
      setMsg(rec.error);
      return;
    }
    await setAssignmentStatus(selected.id, "in_progress");
    setComment("");
    setErr(false);
    setMsg(L("Запись в журнале добавлена.", "Журналга жазуу кошулду."));
  }

  async function onAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !selected) return;
    if (answer.trim().length < 20) {
      setErr(true);
      setMsg(L("Протокол слишком короткий (минимум ~20 символов).", "Протокол өтө кыска."));
      return;
    }
    const sent = await submitFinalAnswer(selected.id, currentUser, answer);
    if (sent && "ok" in sent && !sent.ok) {
      setErr(true);
      setMsg(sent.error);
      return;
    }
    setAnswer("");
    setErr(false);
    setMsg(L("Протокол сохранён. Обращение завершено.", "Протокол сакталды."));
  }

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
        lead={
          readOnly
            ? L("Список поручений, исполнитель и статус.", "Тапшырмалардын тизмеси.")
            : L("Журнал исполнения, срок, протокол.", "Аткаруу журналы, мөөнөт, протокол.")
        }
      />

      <div className="grid gap-2 sm:grid-cols-4">
        {(
          [
            { key: "all" as const, label: L("Все", "Баары"), n: counts.all, icon: ClipboardCheck },
            { key: "open" as const, label: L("В работе", "Ачык"), n: counts.open, icon: Clock },
            { key: "overdue" as const, label: L("Просрочено", "Мөөнөтү өткөн"), n: counts.overdue, icon: AlertTriangle },
            { key: "done" as const, label: L("Завершено", "Бүттү"), n: counts.done, icon: CheckCircle2 },
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
            description={L(
              "После личного приёма или поручения обращения появятся здесь.",
              "Жеке кабыл алуудан кийин бул жерде пайда болот."
            )}
            className="border-0 shadow-none"
          />
        ) : (
          <ul className="max-h-[min(70vh,560px)] space-y-2 overflow-y-auto">
            {items.map((a) => {
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
                      <div className="font-mono text-xs text-slate-500">{a.code}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {overdue && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            {L("Просрочка", "Мөөнөт")}
                          </span>
                        )}
                        <StageBadge stage={a.stage} />
                      </div>
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900">{a.fullName}</div>
                    <div className="text-xs text-slate-500">
                      {a.assignment?.responsibleName || "—"} · {L("срок", "мөөнөт")}{" "}
                      {a.assignment?.dueDate || "—"}
                      {a.assignment?.status && ` · ${a.assignment.status}`}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
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
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950">
                <strong>{L("Поручение:", "Тапшырма:")}</strong> {selected.assignment?.text || "—"}
              </div>
              <Link
                href={`/admin/appeals/${selected.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-court-blue hover:underline"
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

            {readOnly ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {L("Исполнитель", "Аткаруучу")}: {selected.assignment?.responsibleName || "—"} ·{" "}
                {L("статус", "статус")}: {selected.assignment?.status || "—"}
              </div>
            ) : (
              <>
                <form onSubmit={onLog} className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      {L("Действие", "Аракет")}
                    </span>
                    <select className="input w-full" value={action} onChange={(e) => setAction(e.target.value)}>
                      {ACTION_PRESETS.map((p) => (
                        <option key={p.ru} value={p.ru}>
                          {isKy ? p.ky : p.ru}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">
                      {L("Комментарий / результат", "Комментарий")}
                    </span>
                    <textarea
                      className="input min-h-[70px] w-full"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="btn-outline !text-sm">
                    {L("Добавить в журнал", "Журналга кошуу")}
                  </button>
                </form>

                {selected.stage !== "closed" && (
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
                        required
                      />
                    </label>
                    <button type="submit" className="btn-primary !text-sm">
                      {L("Сохранить протокол и завершить", "Протоколду сактап, аяктоо")}
                    </button>
                  </form>
                )}
              </>
            )}

            {selected.controlLog.length > 0 && (
              <ul className="max-h-36 space-y-2 overflow-y-auto border-t border-slate-100 pt-3 text-xs">
                {selected.controlLog.map((c) => (
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
