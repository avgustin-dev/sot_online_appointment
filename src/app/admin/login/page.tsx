"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { EmblemKR } from "@/components/brand/Emblem";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { backend } from "@/api/client";
import { ApiError } from "@/api/http";
import { setAccessToken } from "@/api/session";
import { staffHomePath } from "@/lib/staff";
import { DEMO_ACCOUNTS } from "@/lib/acl";
import { useRemoteApi } from "@/config/env";

export default function AdminLoginPage() {
  const { hydrateStaffSession, currentUser, ready, state, loginStaff } = useStore();
  const router = useRouter();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready || !currentUser) return;
    const pending = state.appointments.some((a) => a.status === "pending_review");
    router.replace(staffHomePath(currentUser, pending));
  }, [ready, currentUser, router, state.appointments]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!useRemoteApi && loginStaff) {
        const data = await loginStaff(loginName.trim(), password);
        if (!data.ok) {
          setError(data.error);
          return;
        }
        hydrateStaffSession(data.user);
        return;
      }
      const data = await backend.auth.login({
        login: loginName.trim(),
        password,
      });
      setAccessToken(data.token);
      hydrateStaffSession(data.user);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : isKy
            ? "Кирүү мүмкүн болгон жок"
            : "Не удалось войти";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5]">
      <header className="border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <EmblemKR size={40} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900 sm:text-sm">
              {t.orgName}
            </div>
            <div className="text-[11px] text-slate-500">
              {isKy ? "Кызматтык кабинет" : "Служебный кабинет"}
            </div>
          </div>
          <LangSwitch />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-semibold text-slate-900">
            {isKy ? "Кызматтык кабинет" : "Служебный кабинет"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isKy
              ? "Кирүү үчүн кызматтык логин жана сырсөз"
              : "Вход по служебному логину и паролю"}
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="login">
                  {isKy ? "Логин" : "Логин"}
                </label>
                <input
                  id="login"
                  className="input"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  {isKy ? "Сырсөз" : "Пароль"}
                </label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy
                  ? isKy
                    ? "Кирүүдө…"
                    : "Вход…"
                  : isKy
                    ? "Кирүү"
                    : "Войти"}
              </button>
            </div>
          </form>

          {!useRemoteApi && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <p className="font-semibold text-slate-900">
                {isKy ? "Демо-кирүү (презентация)" : "Демо-вход (презентация)"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {isKy
                  ? "Демо-сырсөз бардык эсептер үчүн: 1111"
                  : "Демо-пароль для всех учётных записей: 1111"}
              </p>
              <ul className="mt-3 space-y-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <li key={a.login}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => {
                        setLoginName(a.login);
                        setPassword(a.password);
                      }}
                    >
                      <span className="font-medium text-slate-800">
                        {isKy ? a.labelKy : a.labelRu}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {a.login}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 text-center text-sm">
            <Link
              href="/"
              className="font-medium text-court-blue hover:underline"
            >
              ← {isKy ? "Коомдук бөлүм" : "Публичный раздел"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
