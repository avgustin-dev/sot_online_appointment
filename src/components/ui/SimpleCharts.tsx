"use client";

import { cn } from "@/lib/utils";

export type ChartItem = {
  key: string;
  label: string;
  value: number;
  color?: string;
};

const PALETTE = [
  "#1e3a5f",
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#64748b",
  "#059669",
];

/** Горизонтальные бары — KPI / этапы */
export function HBarChart({
  items,
  max,
  className,
}: {
  items: ChartItem[];
  max?: number;
  className?: string;
}) {
  const m = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item, idx) => {
        const pct = Math.round((item.value / m) * 100);
        const color = item.color || PALETTE[idx % PALETTE.length];
        return (
          <li key={item.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-700">
                {item.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  minWidth: item.value > 0 ? 4 : 0,
                }}
              />
            </div>
          </li>
        );
      })}
      {items.length === 0 && (
        <li className="text-sm text-slate-400">Нет данных</li>
      )}
    </ul>
  );
}

/** Кольцевая диаграмма (donut) — SVG без зависимостей */
export function DonutChart({
  items,
  size = 140,
  centerLabel,
  centerValue,
  className,
}: {
  items: ChartItem[];
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = size / 2;
  const stroke = size * 0.14;
  const radius = r - stroke;
  const c = 2 * Math.PI * radius;

  const segments = items
    .filter((i) => i.value > 0)
    .reduce<{ offset: number; out: Array<ChartItem & { color: string; dash: string; offset: number }> }>(
      (acc, item, idx) => {
        const frac = item.value / total;
        const len = frac * c;
        acc.out.push({
          ...item,
          color: item.color || PALETTE[idx % PALETTE.length],
          dash: `${len} ${c - len}`,
          offset: -acc.offset,
        });
        acc.offset += len;
        return acc;
      },
      { offset: 0, out: [] }
    ).out;

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={r}
            cy={r}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${r} ${r})`}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        {(centerValue !== undefined || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue !== undefined && (
              <div className="text-xl font-semibold tabular-nums text-slate-900">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="max-w-[70%] text-[10px] leading-tight text-slate-500">
                {centerLabel}
              </div>
            )}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {items.map((item, idx) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: item.color || PALETTE[idx % PALETTE.length],
              }}
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">
              {item.label}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
