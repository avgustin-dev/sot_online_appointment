"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { average, normalizePhone } from "@/lib/utils";
import type { AppealCard } from "@/lib/types";
import { targetShort } from "@/lib/targets";
import { useI18n } from "@/lib/i18n";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Collapsible } from "@/components/ui/Collapsible";
import { DonutChart, HBarChart } from "@/components/ui/SimpleCharts";
import { ReportPanel } from "@/components/staff/ReportPanel";

export default function AnalyticsPage() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const appeals = state.appeals.filter((a) => a.stage !== "cancelled");
  const all = state.appeals;
  const appointments = state.appointments;
  const serviceContent = state.serviceContent;

  const stats = useMemo(() => {
    const byStage: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byTopic = new Map<string, number>();
    const byTargetCount = new Map<string, number>();

    for (const a of all) {
      byStage[a.stage] = (byStage[a.stage] || 0) + 1;
    }
    for (const apt of appointments) {
      byTargetCount.set(apt.targetId, (byTargetCount.get(apt.targetId) || 0) + 1);
    }
    for (const a of appeals) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      const topicKey = a.topic.trim().toLowerCase();
      byTopic.set(topicKey, (byTopic.get(topicKey) || 0) + 1);
    }

    const groups = new Map<string, AppealCard[]>();
    for (const a of appeals) {
      const key = normalizePhone(a.phone) || a.fullName.toLowerCase();
      const list = groups.get(key) || [];
      list.push(a);
      groups.set(key, list);
    }

    const repeated = Array.from(groups.entries())
      .filter(([, list]) => list.length > 1)
      .map(([key, list]) => ({
        key,
        name: list[0].fullName,
        phone: list[0].phone,
        count: list.length,
        themes: Array.from(new Set(list.map((x) => x.topic))),
        codes: list.map((x) => x.code),
        ids: list.map((x) => x.id),
      }))
      .sort((a, b) => b.count - a.count);

    const feedbacks = appeals.filter((a) => a.feedback).map((a) => a.feedback!);
    const quality = {
      count: feedbacks.length,
      respectful: average(feedbacks.map((f) => f.respectful)),
      clearNextSteps: average(feedbacks.map((f) => f.clearNextSteps)),
      convenient: average(feedbacks.map((f) => f.convenient)),
      deadlinesMet: average(feedbacks.map((f) => f.deadlinesMet)),
      overall: average(
        feedbacks.flatMap((f) => [
          f.respectful,
          f.clearNextSteps,
          f.convenient,
          f.deadlinesMet,
        ])
      ),
    };

    const topThemes = Array.from(byTopic.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const systemic = topThemes
      .filter(([, n]) => n >= 2)
      .map(([theme, n]) => ({ theme, n }));

    const stageItems = Object.entries(byStage).map(([k, v]) => ({
      key: k,
      label: t.stages[k] || k,
      value: v,
    }));

    const catItems = Object.entries(byCategory).map(([k, v]) => ({
      key: k,
      label: t.categories[k] || k,
      value: v,
    }));

    const targetItems = Array.from(byTargetCount.entries())
      .map(([k, v]) => ({
        key: k,
        label: targetShort(k, isKy, serviceContent),
        value: v,
      }))
      .sort((a, b) => b.value - a.value);

    const qualityItems = [
      { key: "r", label: isKy ? "Урмат" : "Уважение", value: quality.respectful || 0 },
      { key: "c", label: isKy ? "Айкындык" : "Ясность", value: quality.clearNextSteps || 0 },
      { key: "u", label: isKy ? "Ыңгайлуулук" : "Удобство", value: quality.convenient || 0 },
      { key: "d", label: isKy ? "Мөөнөт" : "Сроки", value: quality.deadlinesMet || 0 },
    ].map((x) => ({ ...x, value: Math.round(x.value * 10) / 10 }));

    return {
      byStage,
      byCategory,
      repeated,
      quality,
      topThemes,
      systemic,
      stageItems,
      catItems,
      targetItems,
      qualityItems,
    };
  }, [appeals, all, appointments, isKy, t, serviceContent]);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.analytics },
        ]}
      />
      <div>
        <h1 className="section-title">{t.admin.analytics}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {isKy
            ? "Кайталанма кайрылуулар, категориялар, сервистин сапаты. Жетекчилик үчүн."
            : "Повторные обращения, категории, качество сервиса. Сведения для руководства."}
        </p>
      </div>

      <ReportPanel
        appeals={state.appeals}
        appointments={state.appointments}
        serviceContent={state.serviceContent}
        isKy={isKy}
        lang={lang === "ky" ? "ky" : "ru"}
        orgName={t.orgName}
        reportTitle={t.admin.reportTitle}
        reportSubtitle={t.admin.reportSubtitle}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: isKy ? "Кайрылуулар" : "Всего обращений", v: appeals.length },
          { label: isKy ? "Кайталанма" : "Повторные граждане", v: stats.repeated.length },
          { label: isKy ? "Баалар" : "Оценок", v: stats.quality.count },
          {
            label: isKy ? "Орточо" : "Средняя оценка",
            v: stats.quality.overall
              ? stats.quality.overall.toFixed(1)
              : "—",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
          >
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className="mt-1 font-display text-3xl font-semibold text-slate-900">
              {k.v}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            {isKy ? "Этаптар" : "По этапам"}
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {isKy ? "Бардык статус" : "Включая отменённые"}
          </p>
          <HBarChart items={stats.stageItems} />
        </section>
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-900">
            {isKy ? "Категориялар" : "По категориям"}
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            {isKy ? "Активдүү кайрылуулар" : "Активные обращения"}
          </p>
          <DonutChart
            items={stats.catItems}
            centerValue={appeals.length}
            centerLabel={isKy ? "бардыгы" : "всего"}
          />
        </section>
      </div>

      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">
          {isKy ? "Адресаттар боюнча" : "По адресатам приёма"}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          {isKy
            ? "Кимге канча жазылуу түшкөн (бардык мезгил)"
            : "Сколько записей поступило на каждого адресата (за всё время)"}
        </p>
        {stats.targetItems.length === 0 ? (
          <p className="text-sm text-slate-400">
            {isKy ? "Азырынча жазылуу жок." : "Записей пока нет."}
          </p>
        ) : (
          <HBarChart items={stats.targetItems} />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Collapsible
          title={isKy ? "Кайталанма кайрылуулар" : "Повторные обращения"}
          subtitle={
            isKy
              ? "Бир телефон / ФИО — бир нече жолу"
              : "Один телефон/ФИО — несколько раз"
          }
          defaultOpen
        >
          {stats.repeated.length === 0 ? (
            <p className="text-sm text-slate-400">
              {isKy ? "Азырынча жок." : "Пока нет повторов."}
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.repeated.map((r) => (
                <li
                  key={r.key}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      {r.count} {isKy ? "кайрылуу" : "обращ."}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{r.phone}</div>
                  <div className="mt-2 text-sm text-slate-700">
                    {isKy ? "Темалар" : "Темы"}: {r.themes.join("; ")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {r.ids.map((id, i) => (
                      <Link
                        key={id}
                        href={`/admin/appeals/${id}`}
                        className="font-mono font-medium text-court-blue hover:underline"
                      >
                        {r.codes[i]}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>

        <Collapsible
          title={isKy ? "Системдүү темалар" : "Системные темы"}
          subtitle={
            isKy
              ? "Бир нече жолу кайталанган"
              : "Темы, встречающиеся неоднократно"
          }
          defaultOpen
        >
          <ul className="space-y-2">
            {stats.systemic.length === 0 && (
              <li className="text-sm text-slate-400">
                {isKy ? "Маалымат аз." : "Недостаточно данных."}
              </li>
            )}
            {stats.systemic.map((s) => (
              <li
                key={s.theme}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="capitalize text-slate-700">{s.theme}</span>
                <span className="font-semibold text-slate-900">{s.n}</span>
              </li>
            ))}
          </ul>
        </Collapsible>

        <Collapsible
          title={
            isKy
              ? "Коомдук кабыл алуунун сапаты"
              : "Качество общественной приёмной"
          }
          subtitle="1–5"
          defaultOpen
        >
          <HBarChart
            items={stats.qualityItems.map((q) => ({
              ...q,
              value: q.value || 0,
            }))}
            max={5}
          />
        </Collapsible>
      </div>
    </div>
  );
}
