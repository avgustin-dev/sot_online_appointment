"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { PageLoader } from "@/components/ui/PageLoader";
import { HBarChart } from "@/components/ui/SimpleCharts";
import { Collapsible } from "@/components/ui/Collapsible";
import { useI18n } from "@/lib/i18n";

/**
 * Только статистика (без очистки / правок) — основное на opros.sot.kg.
 */
export default function SurveyResultsPage() {
  const { ready, state } = useStore();
  const { lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const questions = useMemo(
    () =>
      [...(state.surveyQuestions || [])]
        .filter((q) => q.enabled)
        .sort((a, b) => a.order - b.order),
    [state.surveyQuestions]
  );

  const responses = state.surveyResponses || [];

  const byCourt = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of responses) {
      const name = r.courtName || "—";
      m.set(name, (m.get(name) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ key: label, label, value }))
      .sort((a, b) => b.value - a.value);
  }, [responses]);

  const stats = useMemo(() => {
    return questions.map((q) => {
      if (q.type === "text") {
        const texts = responses
          .map((r) => r.answers[q.id]?.text?.trim())
          .filter(Boolean) as string[];
        return {
          question: q,
          kind: "text" as const,
          texts: texts.slice(-12).reverse(),
          total: texts.length,
        };
      }
      const counts: Record<string, number> = {};
      for (const o of q.options) counts[o.id] = 0;
      let answered = 0;
      for (const r of responses) {
        const a = r.answers[q.id];
        if (a?.optionId && counts[a.optionId] !== undefined) {
          counts[a.optionId] += 1;
          answered += 1;
        }
      }
      return {
        question: q,
        kind: "single" as const,
        counts,
        answered,
      };
    });
  }, [questions, responses]);

  if (!ready) return <PageLoader label={L("Загрузка…", "Жүктөлүүдө…")} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            {L("Результаты опросника — в разработке", "Сурамжылоо жыйынтыктары — иштелип жатат")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {L("Только статистика по заполненным анкетам.", "Толтурулган анкеталар боюнча статистика гана.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/survey" className="btn-outline !text-sm">
            ← {L("Вопросы", "Суроолор")}
          </Link>
          <Link
            href="/survey"
            target="_blank"
            className="btn-outline !text-sm"
          >
            {L("Анкета (суды)", "Анкета (соттор)")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">{L("Анкет", "Анкета")}</div>
          <div className="text-2xl font-bold text-slate-900">
            {responses.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">{L("Вопросов", "Суроолор")}</div>
          <div className="text-2xl font-bold text-slate-900">
            {questions.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-slate-500">{L("Последняя", "Акыркы")}</div>
          <div className="text-sm font-semibold text-slate-900">
            {responses[0]
              ? new Date(responses[0].at).toLocaleString(isKy ? "ky-KG" : "ru-RU")
              : "—"}
          </div>
        </div>
      </div>

      {byCourt.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            {L("По судам", "Соттор боюнча")}
          </h2>
          <HBarChart items={byCourt} />
        </section>
      )}

      <div className="space-y-3">
        {stats.map((s) => (
          <Collapsible
            key={s.question.id}
            title={`${L("Вопрос", "Суроо")} ${s.question.order}`}
            subtitle={isKy ? s.question.textKy || s.question.textRu : s.question.textRu}
            defaultOpen={s.question.order <= 3}
          >
            {s.kind === "single" && (
              <HBarChart
                items={s.question.options.map((o) => ({
                  key: o.id,
                  label: isKy ? o.textKy || o.textRu : o.textRu,
                  value: s.counts[o.id] || 0,
                }))}
              />
            )}
            {s.kind === "text" && (
              <div>
                <p className="mb-2 text-xs text-slate-500">
                  {L("Текстовых ответов", "Текст жооптору")}: {s.total}
                  {s.total > 12 ? L(" (показаны первые 12)", " (биринчи 12)") : ""}
                </p>
                {s.texts.length === 0 ? (
                  <p className="text-sm text-slate-400">{L("Нет ответов.", "Жооп жок.")}</p>
                ) : (
                  <ul className="space-y-2">
                    {s.texts.map((t, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
