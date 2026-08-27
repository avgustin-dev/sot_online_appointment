import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function generateCode(year = new Date().getFullYear()): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `VS-${year}-${n}`;
}

/**
 * Код — публичный ключ поиска записи, дубликаты недопустимы.
 * Перегенерируем, пока не найдём свободный; после 100 попыток
 * (диапазон почти исчерпан) переходим на номер по времени.
 */
export function generateUniqueCode(
  isTaken: (code: string) => boolean,
  year = new Date().getFullYear()
): string {
  for (let i = 0; i < 100; i++) {
    const code = generateCode(year);
    if (!isTaken(code)) return code;
  }
  return `VS-${year}-${Date.now().toString().slice(-8)}`;
}

export function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

export function matchCitizen(
  a: { fullName: string; phone: string },
  b: { fullName: string; phone: string }
): boolean {
  const p1 = normalizePhone(a.phone);
  const p2 = normalizePhone(b.phone);
  if (p1 && p2 && p1 === p2) return true;
  return (
    a.fullName.trim().toLowerCase() === b.fullName.trim().toLowerCase() &&
    p1.slice(-9) === p2.slice(-9)
  );
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function stageProgress(stage: string): number {
  const map: Record<string, number> = {
    registered: 15,
    under_review: 30,
    ready_for_reception: 45,
    reception_done: 60,
    in_control: 75,
    closed: 100,
    cancelled: 0,
  };
  return map[stage] ?? 0;
}
