/** Периоды для печатных отчётов (Заявки, Мониторинг) — месяц / квартал / год / произвольный диапазон. */

export type ReportPeriod = {
  from: string; // YYYY-MM-DD, включительно
  to: string; // YYYY-MM-DD, включительно
  labelRu: string;
  labelKy: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toRu(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${String(
    d.getFullYear()
  ).slice(2)}`;
}

export function isoToRu(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y.slice(2)}`;
}

export function todayIso(): string {
  return toIso(new Date());
}

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const MONTH_NAMES_KY = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export const QUARTER_ROMAN = ["I", "II", "III", "IV"] as const;

/** Месяц произвольного года. monthIndex0 — 0 (январь) … 11 (декабрь). */
export function monthPeriod(year: number, monthIndex0: number): ReportPeriod {
  const from = new Date(year, monthIndex0, 1);
  const to = new Date(year, monthIndex0 + 1, 0);
  return {
    from: toIso(from),
    to: toIso(to),
    labelRu: `${MONTH_NAMES_RU[monthIndex0]} ${year}`,
    labelKy: `${MONTH_NAMES_KY[monthIndex0]} ${year}`,
  };
}

/** Квартал произвольного года. quarterIndex0 — 0 (I) … 3 (IV). */
export function quarterPeriod(year: number, quarterIndex0: number): ReportPeriod {
  const from = new Date(year, quarterIndex0 * 3, 1);
  const to = new Date(year, quarterIndex0 * 3 + 3, 0);
  const rangeRu = `${toRu(from)} – ${toRu(to)}`;
  return {
    from: toIso(from),
    to: toIso(to),
    labelRu: `${QUARTER_ROMAN[quarterIndex0]} квартал ${year}: ${rangeRu}`,
    labelKy: `${QUARTER_ROMAN[quarterIndex0]}-чейрек ${year}: ${rangeRu}`,
  };
}

export function yearPeriod(year: number): ReportPeriod {
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);
  return {
    from: toIso(from),
    to: toIso(to),
    labelRu: `${year} год`,
    labelKy: `${year}-жыл`,
  };
}

export function currentMonthPeriod(now: Date = new Date()): ReportPeriod {
  return monthPeriod(now.getFullYear(), now.getMonth());
}

export function currentQuarterPeriod(now: Date = new Date()): ReportPeriod {
  return quarterPeriod(now.getFullYear(), Math.floor(now.getMonth() / 3));
}

export function currentYearPeriod(now: Date = new Date()): ReportPeriod {
  return yearPeriod(now.getFullYear());
}

export function customPeriod(fromIso: string, toIso_: string): ReportPeriod {
  const from = fromIso || todayIso();
  const to = toIso_ || from;
  const rangeRu = `${isoToRu(from)} – ${isoToRu(to)}`;
  return {
    from,
    to,
    labelRu: rangeRu,
    labelKy: rangeRu,
  };
}

/** Без ограничения по дате — весь журнал. */
export function allPeriod(): ReportPeriod {
  return {
    from: "1970-01-01",
    to: "2100-12-31",
    labelRu: "Все записи",
    labelKy: "Бардык жазылуулар",
  };
}

export function isAllPeriod(period: ReportPeriod): boolean {
  return period.from <= "1970-01-01" && period.to >= "2100-12-31";
}

/** Отбирает записи (или что угодно с полем date=YYYY-MM-DD) по периоду, включительно. */
export function filterByPeriod<T extends { date: string }>(
  items: T[],
  period: ReportPeriod
): T[] {
  if (isAllPeriod(period)) return items;
  return items.filter((x) => x.date >= period.from && x.date <= period.to);
}
