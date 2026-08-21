/**
 * Среда фронта. Все данные и действия идут через бэкенд (NEXT_PUBLIC_API_URL).
 * Локального дублирования бизнес-логики нет — без заданного API кабинет и запись
 * не работают (см. sot-reception-api).
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
} as const;

export const useRemoteApi = Boolean(env.apiUrl);
