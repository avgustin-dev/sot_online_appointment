/**
 * Среда фронта.
 * Если NEXT_PUBLIC_API_URL задан — данные идут на бэкенд.
 * Если пусто — локальный контур (Zustand / localStorage), для показа без API.
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
} as const;

export const useRemoteApi = Boolean(env.apiUrl);
