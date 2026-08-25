"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { PageLoader } from "@/components/ui/PageLoader";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AppealCategory, EligibilityTreeNode } from "@/lib/types";
import type { RefusalMessage } from "@/lib/eligibility";

type FlatRow = {
  node: EligibilityTreeNode;
  depth: number;
  parentId: string | null;
};

function flatten(
  nodes: EligibilityTreeNode[],
  depth = 0,
  parentId: string | null = null
): FlatRow[] {
  const out: FlatRow[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth, parentId });
    if (n.children?.length) {
      out.push(...flatten(n.children, depth + 1, n.id));
    }
  }
  return out;
}

function findNode(
  nodes: EligibilityTreeNode[],
  id: string
): EligibilityTreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findNode(n.children, id);
      if (f) return f;
    }
  }
  return undefined;
}

function emptyRefusal(): RefusalMessage {
  return {
    greetingRu: "Уважаемый пользователь!",
    greetingKy: "Урматтуу колдонуучу!",
    bodyRu: [""],
    bodyKy: [""],
    closingRu: "С уважением, Верховный суд Кыргызской Республики.",
    closingKy: "Урматтоо менен, Кыргыз Республикасынын Жогорку соту.",
  };
}

type Draft = {
  id: string;
  labelRu: string;
  labelKy: string;
  isLeaf: boolean;
  allowed: boolean;
  category: AppealCategory;
  topicRu: string;
  topicKy: string;
  refusal: RefusalMessage;
};

function nodeToDraft(n: EligibilityTreeNode): Draft {
  const isLeaf = !n.children?.length;
  return {
    id: n.id,
    labelRu: n.labelRu ?? "",
    labelKy: n.labelKy ?? "",
    isLeaf,
    allowed: Boolean(n.allowed),
    category: n.category ?? "organization",
    topicRu: n.topicRu ?? "",
    topicKy: n.topicKy ?? "",
    refusal: n.refusal
      ? {
          greetingRu: n.refusal.greetingRu ?? "",
          greetingKy: n.refusal.greetingKy ?? "",
          bodyRu: [...(n.refusal.bodyRu ?? [""])],
          bodyKy: [...(n.refusal.bodyKy ?? [""])],
          closingRu: n.refusal.closingRu ?? "",
          closingKy: n.refusal.closingKy ?? "",
        }
      : emptyRefusal(),
  };
}

const CATEGORIES: { value: AppealCategory; label: string }[] = [
  { value: "organization", label: "Организация судопроизводства" },
  { value: "court_activity", label: "Деятельность суда" },
  { value: "legislation", label: "Законодательство" },
  { value: "other", label: "Иное" },
];

export default function EligibilityCmsPage() {
  const {
    ready,
    state,
    currentUser,
    patchEligibilityNode,
    removeEligibilityNode,
    addEligibilityNode,
    resetEligibilityTree,
  } = useStore();
  const { lang } = useI18n();
  const isKy = lang === "ky";

  const tree = state.eligibilityTree ?? [];
  const rows = useMemo(() => flatten(tree), [tree]);

  const canEdit =
    !!currentUser &&
    ["admin", "reception", "leadership"].includes(currentUser.role);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  // Черновик подтягивается из дерева только при смене выбранного узла —
  // иначе несвязанное обновление дерева (например, сохранение в другом узле)
  // затирало бы то, что редактор уже печатает в форме.
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс черновика при снятии выбора узла
      setDraft(null);
      return;
    }
    const n = findNode(tree, selectedId);
    if (n) setDraft(nodeToDraft(n));
    else {
      setSelectedId(null);
      setDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) {
    return <PageLoader label={isKy ? "Жүктөө…" : "Загрузка…"} />;
  }

  function select(id: string) {
    setSelectedId(id);
    setMsg("");
    setErr(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !draft) {
      setErr(true);
      setMsg(
        isKy
          ? "Түзөтүүгө укук жок же түйүн тандалган жок."
          : "Нет прав на редактирование или узел не выбран."
      );
      return;
    }
    if (!draft.labelRu.trim()) {
      setErr(true);
      setMsg(isKy ? "RU белгиси милдеттүү." : "Подпись на русском обязательна.");
      return;
    }

    const patch: Partial<EligibilityTreeNode> = {
      labelRu: draft.labelRu.trim(),
      labelKy: draft.labelKy.trim() || draft.labelRu.trim(),
    };

    if (draft.isLeaf) {
      patch.allowed = draft.allowed;
      if (draft.allowed) {
        patch.category = draft.category;
        patch.topicRu = draft.topicRu.trim() || draft.labelRu.trim();
        patch.topicKy =
          draft.topicKy.trim() || draft.labelKy.trim() || draft.labelRu.trim();
        patch.refusal = undefined;
      } else {
        patch.category = undefined;
        patch.topicRu = undefined;
        patch.topicKy = undefined;
        patch.refusal = {
          greetingRu: draft.refusal.greetingRu.trim(),
          greetingKy: draft.refusal.greetingKy.trim(),
          bodyRu: draft.refusal.bodyRu.map((x) => x.trim()).filter(Boolean),
          bodyKy: draft.refusal.bodyKy.map((x) => x.trim()).filter(Boolean),
          closingRu: draft.refusal.closingRu.trim(),
          closingKy: draft.refusal.closingKy.trim(),
        };
      }
    }

    const saved = await patchEligibilityNode(draft.id, patch);
    if (saved && "ok" in saved && !saved.ok) {
      setErr(true);
      setMsg(saved.error);
      return;
    }
    setErr(false);
    setMsg(isKy ? "Сакталды. Жарандардын жазылуусунда көрүнөт." : "Сохранено. Отображается в записи граждан.");
  }

  function onAddRoot() {
    if (!canEdit) return;
    const id = generateId("el");
    const node: EligibilityTreeNode = {
      id,
      labelRu: "Новая категория",
      labelKy: "Жаңы категория",
      children: [
        {
          id: generateId("el"),
          labelRu: "Новый вариант (допуск)",
          labelKy: "Жаңы вариант (допуск)",
          allowed: true,
          category: "other",
          topicRu: "Новый вариант",
          topicKy: "Жаңы вариант",
        },
      ],
    };
    addEligibilityNode(null, node);
    select(id);
    setMsg(isKy ? "Категория кошулду." : "Категория добавлена.");
  }

  function onAddChild(parentId: string) {
    if (!canEdit) return;
    const id = generateId("el");
    const node: EligibilityTreeNode = {
      id,
      labelRu: "Новый вариант",
      labelKy: "Жаңы вариант",
      allowed: true,
      category: "other",
      topicRu: "Новый вариант",
      topicKy: "Жаңы вариант",
    };
    addEligibilityNode(parentId, node);
    select(id);
    setMsg(isKy ? "Түйүн кошулду." : "Узел добавлен.");
  }

  function onDelete(id: string) {
    if (!canEdit) return;
    if (
      !window.confirm(
        isKy
          ? "Бул түйүндү жана анын балдарын өчүрөсүзбү?"
          : "Удалить этот узел и всех потомков?"
      )
    ) {
      return;
    }
    removeEligibilityNode(id);
    if (selectedId === id) {
      setSelectedId(null);
      setDraft(null);
    }
    setMsg(isKy ? "Өчүрүлдү." : "Удалено.");
  }

  function onReset() {
    if (!canEdit) return;
    if (
      !window.confirm(
        isKy
          ? "Даракты баштапкы үлгүгө кайтаруу?"
          : "Сбросить дерево к заводскому шаблону?"
      )
    ) {
      return;
    }
    resetEligibilityTree();
    setSelectedId(null);
    setDraft(null);
    setMsg(isKy ? "Дарак калыбына келтирилди." : "Дерево восстановлено.");
  }

  const visibleRows = rows.filter((row) => {
    // hide if any ancestor collapsed
    const depth = row.depth;
    if (depth === 0) return true;
    // walk ancestors by scanning previous rows
    const ancestors: string[] = [];
    for (const r of rows) {
      if (r.node.id === row.node.id) break;
      if (r.depth < depth) {
        ancestors[r.depth] = r.node.id;
        ancestors.length = r.depth + 1;
      }
    }
    return !ancestors.some((aid) => collapsed[aid]);
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {isKy ? "Допуск дарагы" : "Дерево допуска к записи"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isKy
              ? "Категориялар жана варианттар, жаран «Допуск» кадамында көрөт. Баш тартуу тексттери ушул жерде."
              : "Категории и варианты, отображаемые гражданину на шаге допуска. Тексты отказа редактируются в данном разделе."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={routes.appointment}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {isKy ? "Жазылуу" : "Открыть запись"}
          </Link>
          <Link
            href="/admin/content"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {isKy ? "Тексттер" : "Тексты сервиса"}
          </Link>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {isKy
            ? "Кароо гана. Түзөтүү үчүн admin / reception / leadership."
            : "Только просмотр. Редактирование: роли admin, reception, leadership."}
        </div>
      )}

      {msg && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          )}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Tree list */}
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {isKy ? "Түзүм" : "Структура"}
              <span className="ml-2 font-normal text-slate-400">
                {rows.length} {isKy ? "түйүн" : "узлов"}
              </span>
            </h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!canEdit}
                onClick={onAddRoot}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {isKy ? "Категория" : "Категория"}
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={onReset}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isKy ? "Сброс" : "Сброс"}
              </button>
            </div>
          </div>

          <ul className="max-h-[min(70vh,640px)] overflow-y-auto p-2">
            {visibleRows.map(({ node, depth }) => {
              const hasKids = Boolean(node.children?.length);
              const isLeaf = !hasKids;
              const active = selectedId === node.id;
              const isCollapsed = collapsed[node.id];
              return (
                <li key={node.id}>
                  <div
                    className={cn(
                      "group flex items-stretch gap-0.5 rounded-lg transition",
                      active
                        ? "bg-court-navy text-white"
                        : "hover:bg-slate-50"
                    )}
                    style={{ paddingLeft: 8 + depth * 14 }}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex w-6 shrink-0 items-center justify-center",
                        active ? "text-white/80" : "text-slate-400"
                      )}
                      onClick={() =>
                        hasKids &&
                        setCollapsed((c) => ({
                          ...c,
                          [node.id]: !c[node.id],
                        }))
                      }
                      aria-label={hasKids ? "Свернуть" : ""}
                      tabIndex={hasKids ? 0 : -1}
                    >
                      {hasKids ? (
                        isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => select(node.id)}
                      className="min-w-0 flex-1 py-2 pr-2 text-left"
                    >
                      <span className="block truncate text-sm font-medium leading-snug">
                        {isKy ? node.labelKy || node.labelRu : node.labelRu}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[11px]",
                          active ? "text-white/65" : "text-slate-400"
                        )}
                      >
                        {isLeaf
                          ? node.allowed
                            ? isKy
                              ? "Допуск · жазылуу"
                              : "Допуск · можно записаться"
                            : isKy
                              ? "Баш тартуу"
                              : "Отказ"
                          : isKy
                            ? "Топ"
                            : "Группа"}
                      </span>
                    </button>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          title={isKy ? "Бала кошуу" : "Добавить дочерний"}
                          onClick={() => onAddChild(node.id)}
                          className={cn(
                            "rounded p-1.5",
                            active
                              ? "hover:bg-white/15"
                              : "text-slate-500 hover:bg-slate-100"
                          )}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title={isKy ? "Өчүрүү" : "Удалить"}
                          onClick={() => onDelete(node.id)}
                          className={cn(
                            "rounded p-1.5",
                            active
                              ? "hover:bg-white/15"
                              : "text-red-500 hover:bg-red-50"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {!rows.length && (
              <li className="px-4 py-8 text-center text-sm text-slate-400">
                {isKy ? "Дарак бош." : "Дерево пусто."}
              </li>
            )}
          </ul>
        </section>

        {/* Editor */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          {!draft ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-slate-400">
              <p>
                {isKy
                  ? "Түзөтүү үчүн солдо түйүн тандаңыз."
                  : "Выберите узел слева для редактирования."}
              </p>
            </div>
          ) : (
            <form onSubmit={onSave} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {isKy ? "Түйүн" : "Редактирование узла"}
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    id: {draft.id}
                  </p>
                </div>
                {draft.isLeaf ? (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      draft.allowed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    )}
                  >
                    {draft.allowed
                      ? isKy
                        ? "Допуск"
                        : "Допуск"
                      : isKy
                        ? "Отказ"
                        : "Отказ"}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {isKy ? "Топ (балдар бар)" : "Группа (есть дети)"}
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Подпись (RU) *
                  </span>
                  <input
                    className="input w-full"
                    value={draft.labelRu}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, labelRu: e.target.value } : d
                      )
                    }
                    disabled={!canEdit}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">
                    Подпись (KY)
                  </span>
                  <input
                    className="input w-full"
                    value={draft.labelKy}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, labelKy: e.target.value } : d
                      )
                    }
                    disabled={!canEdit}
                  />
                </label>
              </div>

              {draft.isLeaf && (
                <>
                  <fieldset className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                    <legend className="px-1 text-xs font-semibold text-slate-600">
                      {isKy ? "Натыйжа" : "Исход выбора"}
                    </legend>
                    <div className="flex flex-wrap gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="allowed"
                          checked={draft.allowed}
                          onChange={() =>
                            setDraft((d) =>
                              d ? { ...d, allowed: true } : d
                            )
                          }
                          disabled={!canEdit}
                        />
                        {isKy ? "Жазылууга уруксат" : "Разрешить запись"}
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="allowed"
                          checked={!draft.allowed}
                          onChange={() =>
                            setDraft((d) =>
                              d ? { ...d, allowed: false } : d
                            )
                          }
                          disabled={!canEdit}
                        />
                        {isKy ? "Баш тартуу (текст)" : "Отказ (показать текст)"}
                      </label>
                    </div>
                  </fieldset>

                  {draft.allowed ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1 sm:col-span-2">
                        <span className="text-xs font-semibold text-slate-600">
                          {isKy ? "Категория" : "Категория обращения"}
                        </span>
                        <select
                          className="input w-full"
                          value={draft.category}
                          onChange={(e) =>
                            setDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    category: e.target
                                      .value as AppealCategory,
                                  }
                                : d
                            )
                          }
                          disabled={!canEdit}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          Тема (RU)
                        </span>
                        <input
                          className="input w-full"
                          value={draft.topicRu}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, topicRu: e.target.value } : d
                            )
                          }
                          disabled={!canEdit}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-slate-600">
                          Тема (KY)
                        </span>
                        <input
                          className="input w-full"
                          value={draft.topicKy}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, topicKy: e.target.value } : d
                            )
                          }
                          disabled={!canEdit}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-red-100 bg-red-50/40 p-3">
                      <p className="text-xs font-semibold text-red-800">
                        {isKy
                          ? "Баш тартуу тексти (жаранга көрсөтүлөт)"
                          : "Текст отказа (показывается гражданину)"}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600">
                            Приветствие RU
                          </span>
                          <input
                            className="input w-full"
                            value={draft.refusal.greetingRu}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        greetingRu: e.target.value,
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600">
                            Приветствие KY
                          </span>
                          <input
                            className="input w-full"
                            value={draft.refusal.greetingKy}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        greetingKy: e.target.value,
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="block space-y-1 sm:col-span-2">
                          <span className="text-xs font-semibold text-slate-600">
                            Абзацы RU (по строке)
                          </span>
                          <textarea
                            className="input min-h-[100px] w-full resize-y"
                            rows={5}
                            value={draft.refusal.bodyRu.join("\n")}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        bodyRu: e.target.value.split("\n"),
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="block space-y-1 sm:col-span-2">
                          <span className="text-xs font-semibold text-slate-600">
                            Абзацы KY (по строке)
                          </span>
                          <textarea
                            className="input min-h-[100px] w-full resize-y"
                            rows={5}
                            value={draft.refusal.bodyKy.join("\n")}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        bodyKy: e.target.value.split("\n"),
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600">
                            Заключение RU
                          </span>
                          <input
                            className="input w-full"
                            value={draft.refusal.closingRu}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        closingRu: e.target.value,
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-600">
                            Заключение KY
                          </span>
                          <input
                            className="input w-full"
                            value={draft.refusal.closingKy}
                            onChange={(e) =>
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      refusal: {
                                        ...d.refusal,
                                        closingKy: e.target.value,
                                      },
                                    }
                                  : d
                              )
                            }
                            disabled={!canEdit}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!draft.isLeaf && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {isKy
                    ? "Бул топ: жаран кийинки деңгээлди тандайт. Бала кошуу үчүн «+» баскычын колдонуңуз."
                    : "Это группа: гражданин выбирает следующий уровень. Чтобы добавить вариант — кнопка «+» у узла."}
                </p>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={!canEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-court-navy/90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isKy ? "Сактоо" : "Сохранить"}
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete(draft.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isKy ? "Өчүрүү" : "Удалить"}
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
