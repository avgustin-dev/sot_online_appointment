"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FEEDBACK_QUESTIONS } from "@/lib/constants";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/**
 * Оценка сервиса: электронная запись + общественная приёмная.
 * Вход по регистрационному коду; можно изменить ранее направленную оценку.
 */
export default function FeedbackIndexPage() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <Breadcrumbs
        items={[
          { label: t.crumbs.home, href: "/" },
          { label: t.crumbs.feedback },
        ]}
      />

      <div className="card p-6 sm:p-8">
        <h1 className="section-title">
          {isKy
            ? "Сервисти баалоо"
            : "Оценка сервиса записи и приёма"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-court-muted">
          {isKy
            ? "Урматтуу жарандар! Сиздин пикириңиз электрондук жазылуунун жана коомдук кабыл алуунун сапатын жакшыртуу үчүн маанилүү. Каттоо кодун билдирүү боюнча көрсөтүңүз. Баалоону кабыл алуудан кийин жөнөтүп, зарыл болсо өзгөртүүгө болот."
            : "Уважаемые граждане! Ваше мнение необходимо для совершенствования электронной записи на приём и работы общественной приёмной. Укажите регистрационный код записи по уведомлению. Оценку можно направить после приёма и при необходимости изменить."}
        </p>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-800">
            {isKy ? "Эмне бааланат" : "Что оценивается"}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {FEEDBACK_QUESTIONS.map((q) => (
              <li key={q.key}>{isKy ? q.labelKy || q.label : q.label}</li>
            ))}
          </ul>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim())
              router.push(routes.evaluationByCode(code.trim().toUpperCase()));
          }}
        >
          <div>
            <label className="label" htmlFor="code">
              {t.feedback.code}
            </label>
            <input
              id="code"
              className="input !min-h-12 !text-base font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VS-2026-...."
              required
            />
          </div>
          <button type="submit" className="btn-primary !min-h-12">
            {t.feedback.go}
          </button>
        </form>

        <p className="mt-6 text-xs text-court-muted">
          {isKy
            ? "Код белгисиз болсо — «Менин жазылууум» бөлүмүнөн кириңиз."
            : "Если код неизвестен — откройте «Моя запись» (код + PIN)."}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href={routes.appointmentStatus}
            className="font-semibold text-court-blue hover:underline"
          >
            {t.nav.myAppointment} →
          </Link>
          <Link href={routes.appointment} className="font-semibold text-court-blue hover:underline">
            {t.nav.book} →
          </Link>
        </div>
      </div>
    </div>
  );
}
