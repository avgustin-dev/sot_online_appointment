/**
 * Среда фронта.
 * Если NEXT_PUBLIC_API_URL задан — данные идут на бэкенд.
 * Если пусто — локальный контур (Zustand / localStorage), для показа без API.
 *
 * NEXT_PUBLIC_DEMO=true включает 20 учебных заявок в локальном контуре.
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, ""),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
  demo: process.env.NEXT_PUBLIC_DEMO === "true",
} as const;

export const useRemoteApi = Boolean(env.apiUrl);
export const useDemoData = env.demo && !useRemoteApi;
