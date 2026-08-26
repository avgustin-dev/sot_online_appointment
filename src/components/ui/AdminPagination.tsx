"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 10;

export function usePagedList<T>(items: T[], pageSize = ADMIN_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [prevLen, setPrevLen] = useState(items.length);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);

  // Сброс на 1-ю страницу при изменении длины списка (фильтр / поиск)
  if (items.length !== prevLen) {
    setPrevLen(items.length);
    setPage(1);
  }

  const safePage = Math.min(Math.max(1, page), totalPages);
  if (page !== safePage) {
    setPage(safePage);
  }

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage,
    totalPages,
    slice,
    total: items.length,
    pageSize,
  };
}

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  isKy,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  isKy?: boolean;
  className?: string;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-600",
        className
      )}
    >
      <span>
        {isKy
          ? `${from}–${to} / ${total}`
          : `${from}–${to} из ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
          aria-label={isKy ? "Мурунку" : "Назад"}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[4.5rem] text-center font-medium text-slate-800">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40"
          aria-label={isKy ? "Кийинки" : "Вперёд"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
