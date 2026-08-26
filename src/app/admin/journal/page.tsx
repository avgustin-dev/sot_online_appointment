"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { SoftBadge } from "@/components/ui/Badge";
import {
  AdminPagination,
  usePagedList,
} from "@/components/ui/AdminPagination";
import { ScrollText } from "lucide-react";
import type { ActionLogEntry } from "@/lib/types";

const ENTITY_LABEL: Record<ActionLogEntry["entity"], { ru: string; ky: string }> = {
  appointment: { ru: "Запись на приём", ky: "Кабыл алууга жазылуу" },
  schedule: { ru: "График", ky: "График" },
  assignment: { ru: "Поручение", ky: "Тапшырма" },
  content: { ru: "Контент", ky: "Мазмун" },
};

function formatAt(at: string) {
  try {
    return format(parseISO(at), "dd.MM.yyyy HH:mm", { locale: ru });
  } catch {
    return at;
  }
}

export default function JournalPage() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const [entityFilter, setEntityFilter] = useState<ActionLogEntry["entity"] | "all">(
    "all"
  );
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const log = [...(state.actionLog ?? [])].sort((a, b) =>
      b.at.localeCompare(a.at)
    );
    const query = q.trim().toLowerCase();
    return log.filter((e) => {
      if (entityFilter !== "all" && e.entity !== entityFilter) return false;
      if (!query) return true;
      return (
        e.userName.toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query) ||
        (e.detail || "").toLowerCase().includes(query) ||
        (e.entityId || "").toLowerCase().includes(query)
      );
    });
  }, [state.actionLog, entityFilter, q]);

  const { page, setPage, totalPages, slice, total, pageSize } =
    usePagedList(filtered);

  function linkFor(entry: ActionLogEntry): string | null {
    if (!entry.entityId) return null;
    if (entry.entity === "assignment") return `/admin/appeals/${entry.entityId}`;
    if (entry.entity === "appointment") {
      const appeal = state.appeals.find((a) => a.appointmentId === entry.entityId);
      if (appeal) return `/admin/appeals/${appeal.id}`;
    }
    return null;
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.journal },
        ]}
      />
      <AdminHeading
        title={isKy ? "Аракеттер журналы" : "Журнал действий"}
        lead={
          isKy
            ? "Системада аткарылган аракеттердин каттоосу: ырастоо, которуу, тапшырма жана график."
            : "Регистрация действий в системе: подтверждение записи, перенос, поручение и изменение графика."
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs"
          placeholder={isKy ? "Издөө…" : "Поиск по журналу…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              "all",
              "appointment",
              "schedule",
              "assignment",
              "content",
            ] as const
          ).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setEntityFilter(key)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                (entityFilter === key
                  ? "border-court-navy bg-court-navy text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              {key === "all"
                ? isKy
                  ? "Баары"
                  : "Все"
                : isKy
                  ? ENTITY_LABEL[key].ky
                  : ENTITY_LABEL[key].ru}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} {isKy ? "жазуу" : "записей"}
        </span>
      </div>

      <section className="card p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={isKy ? "Жазуулар жок" : "Записей нет"}
            description={
              isKy
                ? "Тандалган чыпкага ылайык аракеттер табылган жок."
                : "По выбранному фильтру действий не найдено."
            }
            className="border-0 shadow-none"
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {slice.map((entry) => {
                const href = linkFor(entry);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {entry.action}
                        </span>
                        <SoftBadge tone="muted">
                          {isKy
                            ? ENTITY_LABEL[entry.entity].ky
                            : ENTITY_LABEL[entry.entity].ru}
                        </SoftBadge>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {entry.userName}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </div>
                      {href && (
                        <Link
                          href={href}
                          className="mt-1 inline-block text-xs font-semibold text-court-blue hover:underline"
                        >
                          {isKy ? "Карточканы ачуу →" : "Открыть карточку →"}
                        </Link>
                      )}
                    </div>
                    <div className="shrink-0 whitespace-nowrap text-xs text-slate-400">
                      {formatAt(entry.at)}
                    </div>
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
            />
          </>
        )}
      </section>
    </div>
  );
}
