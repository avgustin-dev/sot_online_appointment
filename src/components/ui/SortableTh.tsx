"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

/** key === null — сортировка по умолчанию (до клика по колонке) */
export type SortState<K extends string> = { key: K | null; dir: SortDir };

/** Цикл: default → asc → desc → default */
export function toggleSort<K extends string>(
  current: SortState<K>,
  key: K
): SortState<K> {
  if (current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return { key: null, dir: "asc" };
}

export function compareValues(
  a: string | number | undefined | null,
  b: string | number | undefined | null,
  dir: SortDir
): number {
  const av = a ?? "";
  const bv = b ?? "";
  let r = 0;
  if (typeof av === "number" && typeof bv === "number") r = av - bv;
  else r = String(av).localeCompare(String(bv), "ru", { numeric: true });
  return dir === "asc" ? r : -r;
}

/** Кликабельный заголовок: стрелка только при активной сортировке */
export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "center",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = sort.key === sortKey;
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(
        className,
        align === "right" && "text-right",
        align === "left" && "text-left",
        align === "center" && "text-center"
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex max-w-full items-center gap-1 uppercase tracking-wide transition hover:text-court-navy",
          active ? "font-bold text-court-navy" : "text-inherit",
          align === "right" && "ml-auto",
          align === "center" && "mx-auto justify-center"
        )}
        title={
          !active
            ? "Сортировать"
            : sort.dir === "asc"
              ? "По убыванию / сбросить"
              : "Сбросить сортировку"
        }
      >
        <span className="truncate">{label}</span>
        {active && (
          <Icon className="h-3.5 w-3.5 shrink-0 text-court-navy" aria-hidden />
        )}
      </button>
    </th>
  );
}
