/** Маска телефона КР: +996 XXX XXX XXX (9 цифр после кода страны). */

export const KG_PHONE_PREFIX = "+996";
export const KG_PHONE_PLACEHOLDER = "+996 XXX XXX XXX";

function localDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("996")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 9);
}

/** Форматирует ввод в +996 XXX XXX XXX. Пустая строка остаётся пустой. */
export function formatKgPhone(raw: string, keepPrefix = true): string {
  const d = localDigits(raw);
  if (!d && !keepPrefix) return "";
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  return parts.length ? `${KG_PHONE_PREFIX} ${parts.join(" ")}` : `${KG_PHONE_PREFIX} `;
}

export function isCompleteKgPhone(raw: string): boolean {
  return localDigits(raw).length === 9;
}
