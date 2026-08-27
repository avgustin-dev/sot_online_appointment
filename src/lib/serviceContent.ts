import { catalog, cloneCatalog } from "./catalog";
import { canonicalPublicHref } from "./routes";
import type { ServiceContent } from "./types";

export function defaultServiceContent(): ServiceContent {
  return cloneCatalog(catalog.site);
}

function normalizeNav<T extends { href: string }>(items: T[]): T[] {
  return items
    .filter((i) => i.href !== "/process")
    .map((i) => ({ ...i, href: canonicalPublicHref(i.href) }));
}

type LegacyFooter = {
  footerDemoRu?: string;
  footerDemoKy?: string;
};

export function mergeServiceContent(
  partial?: Partial<ServiceContent> | null
): ServiceContent {
  const d = defaultServiceContent();
  if (!partial) return d;
  const legacy = partial as Partial<ServiceContent> & LegacyFooter;
  return {
    ...d,
    ...partial,
    footerDisclaimerRu:
      legacy.footerDisclaimerRu || legacy.footerDemoRu || d.footerDisclaimerRu,
    footerDisclaimerKy:
      legacy.footerDisclaimerKy || legacy.footerDemoKy || d.footerDisclaimerKy,
    rules: { ...d.rules, ...(partial.rules ?? {}) },
    contacts: { ...d.contacts, ...(partial.contacts ?? {}) },
    headerNav: normalizeNav(
      Array.isArray(partial.headerNav) ? partial.headerNav : d.headerNav
    ),
    hubNav: normalizeNav(
      Array.isArray(partial.hubNav) ? partial.hubNav : d.hubNav
    ),
    leadership: Array.isArray(partial.leadership)
      ? partial.leadership.map((p) => ({
          ...d.leadership[0],
          ...p,
          weekdays: Array.isArray(p.weekdays) ? p.weekdays : [2, 4],
          showInSchedule: p.showInSchedule ?? true,
          bookable: p.bookable ?? true,
          startMinutes: p.startMinutes ?? 8 * 60,
          endMinutes: p.endMinutes ?? 12 * 60,
        }))
      : d.leadership,
    processSteps: Array.isArray(partial.processSteps)
      ? partial.processSteps
      : d.processSteps,
    memoItemsRu: partial.memoItemsRu ?? d.memoItemsRu,
    memoItemsKy: partial.memoItemsKy ?? d.memoItemsKy,
    allowedRu: partial.allowedRu ?? d.allowedRu,
    allowedKy: partial.allowedKy ?? d.allowedKy,
    forbiddenRu: partial.forbiddenRu ?? d.forbiddenRu,
    forbiddenKy: partial.forbiddenKy ?? d.forbiddenKy,
  };
}

export function pickLocale(
  isKy: boolean,
  ru: string | undefined,
  ky: string | undefined
): string {
  if (isKy) return (ky || ru || "").trim();
  return (ru || ky || "").trim();
}
