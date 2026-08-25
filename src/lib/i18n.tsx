"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { catalog } from "@/lib/catalog";
import type { Dict } from "@/locales/types";

export type Lang = "ru" | "ky";

const LANG_KEY = "vs-kr-lang";
const LANG_COOKIE = "vs-kr-lang";

const dicts: Record<Lang, Dict> = {
  ru: catalog.uiRu,
  ky: catalog.uiKy,
};

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "ky";
  try {
    const fromStore = localStorage.getItem(LANG_KEY);
    if (fromStore === "ru" || fromStore === "ky") return fromStore;
    const match = document.cookie.match(/(?:^|; )vs-kr-lang=(ky|ru)/);
    if (match?.[1] === "ru" || match?.[1] === "ky") return match[1];
  } catch {
    /* ignore */
  }
  return "ky";
}

function persistLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
    document.cookie = `${LANG_COOKIE}=${lang};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

type I18nApi = {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  ready: boolean;
};

const I18nContext = createContext<I18nApi | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ky");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readStoredLang();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- язык читаем из localStorage/cookie только на клиенте
    setLangState(saved);
    persistLang(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    persistLang(lang);
  }, [lang, ready]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const value = useMemo(
    () => ({ lang, t: dicts[lang], setLang, ready }),
    [lang, setLang, ready]
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
