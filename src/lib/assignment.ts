import type { AssignmentStatus } from "./types";

/** Статусы поручения по ТЗ. Ключи совпадают с API бэкенда. */
export const ASSIGNMENT_STATUSES: {
  key: AssignmentStatus;
  ru: string;
  ky: string;
}[] = [
  { key: "not_assigned", ru: "Не назначено", ky: "Дайындалган эмес" },
  { key: "assigned", ru: "Назначено", ky: "Дайындалды" },
  { key: "in_progress", ru: "Принято в работу", ky: "Ишке алынды" },
  { key: "done", ru: "Исполнено", ky: "Аткарылды" },
  { key: "needs_rework", ru: "На доработке", ky: "Оңдоодо" },
];

export function assignmentStatusLabel(
  status: AssignmentStatus | undefined,
  isKy = false
): string {
  const row = ASSIGNMENT_STATUSES.find((s) => s.key === status);
  if (!row) return status || "—";
  return isKy ? row.ky : row.ru;
}
