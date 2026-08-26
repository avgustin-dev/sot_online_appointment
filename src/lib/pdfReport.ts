import type { AppealCard, Appointment, ServiceContent } from "./types";
import { catalog } from "./catalog";
import { average, normalizePhone } from "./utils";
import { pickShell, type UiLang } from "./langCookie";
import { targetPerson, targetShort } from "./targets";
import type { ReportPeriod } from "./reportPeriods";

type ReportInput = {
  appeals: AppealCard[];
  appointments: Appointment[];
  title?: string;
  subtitle?: string;
  orgName?: string;
  lang?: UiLang;
  /** Для подписи ФИО/должности адресатов приёма в разделе «По адресатам». */
  serviceContent?: ServiceContent | null;
  /** Если передан — печатается в шапке отчёта и в имени файла. */
  period?: ReportPeriod;
};

/**
 * Отчёт для руководства: открывает окно печати.
 * В диалоге печати: «Сохранить как PDF» (работает с кириллицей).
 */
export function downloadAppealsReport(input: ReportInput) {
  const lang: UiLang = input.lang === "ru" ? "ru" : "ky";
  const ui = lang === "ky" ? catalog.uiKy : catalog.uiRu;
  const pdf = catalog.shell.pdf;
  const L = (ru: string, ky: string) => pickShell(lang, ru, ky);

  const appeals = input.appeals.filter((a) => a.stage !== "cancelled");
  const appointments = input.appointments;
  const orgName = input.orgName || ui.orgName;
  const title = input.title || L(pdf.titleRu, pdf.titleKy);
  const subtitle = input.subtitle || L(pdf.subtitleRu, pdf.subtitleKy);
  const now = new Date().toLocaleString(lang === "ky" ? "ky-KG" : "ru-RU");

  const groups = new Map<string, AppealCard[]>();
  for (const a of appeals) {
    const key = normalizePhone(a.phone) || a.fullName.toLowerCase();
    const list = groups.get(key) || [];
    list.push(a);
    groups.set(key, list);
  }
  const repeated = Array.from(groups.values()).filter((g) => g.length > 1);

  const feedbacks = appeals.filter((a) => a.feedback).map((a) => a.feedback!);
  const overall = feedbacks.length
    ? average(
        feedbacks.flatMap((f) => [
          f.respectful,
          f.clearNextSteps,
          f.convenient,
          f.deadlinesMet,
        ])
      )
    : 0;

  const byStage = Object.entries(
    appeals.reduce<Record<string, number>>((acc, a) => {
      acc[a.stage] = (acc[a.stage] || 0) + 1;
      return acc;
    }, {})
  );

  type TargetStat = { total: number; byStatus: Record<string, number> };
  const byTarget = new Map<string, TargetStat>();
  for (const apt of appointments) {
    const rec: TargetStat = byTarget.get(apt.targetId) || { total: 0, byStatus: {} };
    rec.total += 1;
    rec.byStatus[apt.status] = (rec.byStatus[apt.status] || 0) + 1;
    byTarget.set(apt.targetId, rec);
  }
  const targetRows = Array.from(byTarget.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([targetId, rec]) => {
      const isKy = lang === "ky";
      const person = targetPerson(targetId, isKy, input.serviceContent);
      const name = person?.fullName || targetShort(targetId, isKy, input.serviceContent) || targetId;
      const position = person?.position || "";
      return `
    <tr>
      <td>${esc(name)}</td>
      <td>${esc(position)}</td>
      <td>${rec.total}</td>
      <td>${rec.byStatus.confirmed || 0}</td>
      <td>${rec.byStatus.accepted || 0}</td>
      <td>${rec.byStatus.no_show || 0}</td>
      <td>${rec.byStatus.cancelled || 0}</td>
    </tr>`;
    })
    .join("");

  const rows = appeals
    .slice(0, 50)
    .map(
      (a) => `
    <tr>
      <td>${esc(a.code)}</td>
      <td>${esc(a.fullName)}</td>
      <td>${esc(a.topic)}</td>
      <td>${esc(ui.categories[a.category] || a.category)}</td>
      <td>${esc(ui.stages[a.stage] || a.stage)}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  body { font-family: "Segoe UI", "Times New Roman", Arial, sans-serif; color: #1a2332; padding: 22px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0B1F3A; }
  h2 { font-size: 13px; margin: 18px 0 8px; color: #0B1F3A; border-bottom: 2px solid #B8954A; padding-bottom: 4px; }
  .meta { color: #5A6B7D; margin-bottom: 14px; }
  .kpis { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0 16px; }
  .kpi { border: 1px solid #D5DEE8; border-radius: 8px; padding: 8px 12px; min-width: 110px; }
  .kpi b { display: block; font-size: 18px; color: #0B1F3A; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #D5DEE8; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #F4F7FB; font-size: 11px; }
  ul { margin: 0; padding-left: 18px; }
  .foot { margin-top: 20px; color: #5A6B7D; font-size: 10px; }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style>
</head>
<body>
  <p class="noprint" style="background:#E8F0F8;padding:10px;border-radius:8px;margin-bottom:16px;">
    <strong>${esc(L(pdf.popupHintRu, pdf.popupHintKy))}</strong>
  </p>
  <h1>${esc(title)}</h1>
  <div class="meta">${esc(orgName)}<br/>${esc(subtitle)}<br/>${
    input.period
      ? `${esc(L(pdf.periodRu, pdf.periodKy))}: ${esc(
          L(input.period.labelRu, input.period.labelKy)
        )}<br/>`
      : ""
  }${esc(L(pdf.generatedRu, pdf.generatedKy))}: ${esc(now)}</div>
  <div class="kpis">
    <div class="kpi"><span>${esc(L("Обращений", "Кайрылуулар"))}</span><b>${appeals.length}</b></div>
    <div class="kpi"><span>${esc(L("Записей", "Жазылуулар"))}</span><b>${appointments.length}</b></div>
    <div class="kpi"><span>${esc(L("Повторные граждане", "Кайталанма жарандар"))}</span><b>${repeated.length}</b></div>
    <div class="kpi"><span>${esc(L("Средняя оценка", "Орточо баа"))}</span><b>${overall ? overall.toFixed(1) : "—"} / 5</b></div>
    <div class="kpi"><span>${esc(L("Оценок", "Баалар"))}</span><b>${feedbacks.length}</b></div>
  </div>
  <h2>${esc(L(pdf.stagesRu, pdf.stagesKy))}</h2>
  <table>
    <thead><tr><th>${esc(L(pdf.colStageRu, pdf.colStageKy))}</th><th>${esc(L("Кол-во", "Саны"))}</th></tr></thead>
    <tbody>
      ${byStage
        .map(
          ([k, n]) =>
            `<tr><td>${esc(ui.stages[k] || k)}</td><td>${n}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
  <h2>${esc(L(pdf.byTargetRu, pdf.byTargetKy))}</h2>
  <table>
    <thead><tr>
      <th>${esc(L(pdf.colTargetRu, pdf.colTargetKy))}</th>
      <th>${esc(L(pdf.colPositionRu, pdf.colPositionKy))}</th>
      <th>${esc(L(pdf.colTotalRu, pdf.colTotalKy))}</th>
      <th>${esc(L(pdf.colConfirmedRu, pdf.colConfirmedKy))}</th>
      <th>${esc(L(pdf.colAcceptedRu, pdf.colAcceptedKy))}</th>
      <th>${esc(L(pdf.colNoShowRu, pdf.colNoShowKy))}</th>
      <th>${esc(L(pdf.colCancelledRu, pdf.colCancelledKy))}</th>
    </tr></thead>
    <tbody>${targetRows || `<tr><td colspan='7'>${esc(L(pdf.noDataRu, pdf.noDataKy))}</td></tr>`}</tbody>
  </table>
  <h2>${esc(L(pdf.repeatedRu, pdf.repeatedKy))}</h2>
  ${
    repeated.length === 0
      ? `<p>${esc(L("Нет повторных обращений.", "Кайталанма кайрылуу жок."))}</p>`
      : `<ul>${repeated
          .map(
            (g) =>
              `<li><strong>${esc(g[0].fullName)}</strong> (${g.length}): ${esc(
                g.map((x) => x.code).join(", ")
              )} — ${esc(g.map((x) => x.topic).join("; "))}</li>`
          )
          .join("")}</ul>`
  }
  <h2>${esc(L(pdf.registryRu, pdf.registryKy))}</h2>
  <table>
    <thead><tr>
      <th>${esc(L(pdf.colCodeRu, pdf.colCodeKy))}</th>
      <th>${esc(L(pdf.colNameRu, pdf.colNameKy))}</th>
      <th>${esc(L(pdf.colTopicRu, pdf.colTopicKy))}</th>
      <th>${esc(L(pdf.colCategoryRu, pdf.colCategoryKy))}</th>
      <th>${esc(L(pdf.colStageRu, pdf.colStageKy))}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan='5'>${esc(L(pdf.noDataRu, pdf.noDataKy))}</td></tr>`}</tbody>
  </table>
  <p class="foot">${esc(L(pdf.footRu, pdf.footKy))}</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},250);}</script>
</body>
</html>`;

  // Важно: без "noopener"/"noreferrer" — с этими флагами window.open()
  // возвращает null в современных браузерах, и записать HTML отчёта в
  // окно невозможно (окно остаётся пустым). Отчёт — это динамический HTML
  // без внешних ссылок, поэтому доп. изоляция здесь не нужна.
  const w = window.open("", "_blank", "width=920,height=720");
  if (!w) {
    alert(L(pdf.popupHintRu, pdf.popupHintKy));
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
