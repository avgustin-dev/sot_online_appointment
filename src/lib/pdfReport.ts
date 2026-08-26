import type { AppealCard, Appointment, ServiceContent } from "./types";
import { catalog } from "./catalog";
import { average, normalizePhone } from "./utils";
import { pickShell, type UiLang } from "./langCookie";
import { targetPerson, targetShort } from "./targets";
import { formatDateRu } from "./slots";
import type { ReportPeriod } from "./reportPeriods";

/** Сводка — KPI и таблицы; реестр — список; полный — всё вместе. */
export type ReportKind = "summary" | "registry" | "full";

type ReportInput = {
  appeals: AppealCard[];
  appointments: Appointment[];
  title?: string;
  subtitle?: string;
  orgName?: string;
  lang?: UiLang;
  serviceContent?: ServiceContent | null;
  period?: ReportPeriod;
  kind?: ReportKind;
};

/**
 * Отчёт для руководства: только диалог печати браузера
 * («Сохранить как PDF»). Без автоскачивания и без новой вкладки.
 */
export function downloadAppealsReport(input: ReportInput) {
  const lang: UiLang = input.lang === "ru" ? "ru" : "ky";
  const ui = lang === "ky" ? catalog.uiKy : catalog.uiRu;
  const pdf = catalog.shell.pdf;
  const L = (ru: string, ky: string) => pickShell(lang, ru, ky);
  const isKy = lang === "ky";
  const kind: ReportKind = input.kind ?? "full";

  const appeals = input.appeals.filter((a) => a.stage !== "cancelled");
  const appointments = input.appointments;
  const aptById = new Map(appointments.map((a) => [a.id, a]));
  const orgName = input.orgName || ui.orgName;
  const baseTitle = input.title || L(pdf.titleRu, pdf.titleKy);
  const subtitle = input.subtitle || L(pdf.subtitleRu, pdf.subtitleKy);
  const now = new Date().toLocaleString(lang === "ky" ? "ky-KG" : "ru-RU");
  const periodLabel = input.period
    ? L(input.period.labelRu, input.period.labelKy)
    : "";

  const kindTitle =
    kind === "summary"
      ? L("Сводка", "Жыйынтык")
      : kind === "registry"
        ? L("Реестр обращений", "Кайрылуулардын реестри")
        : L("Полный отчёт", "Толук отчёт");

  const title = `${baseTitle} — ${kindTitle}`;
  const docTitle = buildReportFileTitle({
    kind,
    periodLabel,
    lang,
  });

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
    const rec: TargetStat = byTarget.get(apt.targetId) || {
      total: 0,
      byStatus: {},
    };
    rec.total += 1;
    rec.byStatus[apt.status] = (rec.byStatus[apt.status] || 0) + 1;
    byTarget.set(apt.targetId, rec);
  }
  const targetRows = Array.from(byTarget.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([targetId, rec]) => {
      const person = targetPerson(targetId, isKy, input.serviceContent);
      const name =
        person?.fullName ||
        targetShort(targetId, isKy, input.serviceContent) ||
        targetId;
      const position = person?.position || "";
      return `
    <tr>
      <td>${esc(name)}</td>
      <td>${esc(position)}</td>
      <td class="num">${rec.total}</td>
      <td class="num">${rec.byStatus.confirmed || 0}</td>
      <td class="num">${rec.byStatus.accepted || 0}</td>
      <td class="num">${rec.byStatus.no_show || 0}</td>
      <td class="num">${rec.byStatus.cancelled || 0}</td>
    </tr>`;
    })
    .join("");

  const registryCompact = kind === "registry" || kind === "full";
  const rows = appeals
    .slice(0, kind === "registry" ? 200 : 80)
    .map((a) => {
      const apt = aptById.get(a.appointmentId);
      const when = apt
        ? `${formatDateRu(apt.date)} ${apt.slotStart}–${apt.slotEnd}`
        : "—";
      const addressee = apt
        ? targetShort(apt.targetId, isKy, input.serviceContent)
        : "—";
      const statusLabel = apt
        ? ui.statuses[apt.status] || apt.status
        : "—";
      return `
    <tr>
      <td>${esc(a.fullName)}</td>
      <td>${esc(a.topic)}</td>
      <td>${esc(addressee)}</td>
      <td class="nowrap">${esc(when)}</td>
      <td>${esc(statusLabel)}</td>
      <td>${esc(ui.stages[a.stage] || a.stage)}</td>
    </tr>`;
    })
    .join("");

  const showSummary = kind === "summary" || kind === "full";
  const showRegistry = kind === "registry" || kind === "full";

  const summaryHtml = showSummary
    ? `
  <div class="kpis">
    <div class="kpi"><span>${esc(L("Обращений", "Кайрылуулар"))}</span><b>${appeals.length}</b></div>
    <div class="kpi"><span>${esc(L("Записей", "Жазылуулар"))}</span><b>${appointments.length}</b></div>
    <div class="kpi"><span>${esc(L("Повторные граждане", "Кайталанма жарандар"))}</span><b>${repeated.length}</b></div>
    <div class="kpi"><span>${esc(L("Средняя оценка", "Орточо баа"))}</span><b>${overall ? overall.toFixed(1) : "—"} / 5</b></div>
  </div>
  <h2>${esc(L(pdf.stagesRu, pdf.stagesKy))}</h2>
  <table>
    <thead><tr><th>${esc(L(pdf.colStageRu, pdf.colStageKy))}</th><th class="num">${esc(L("Кол-во", "Саны"))}</th></tr></thead>
    <tbody>
      ${byStage
        .map(
          ([k, n]) =>
            `<tr><td>${esc(ui.stages[k] || k)}</td><td class="num">${n}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
  <h2>${esc(L(pdf.byTargetRu, pdf.byTargetKy))}</h2>
  <table>
    <thead><tr>
      <th>${esc(L(pdf.colTargetRu, pdf.colTargetKy))}</th>
      <th>${esc(L(pdf.colPositionRu, pdf.colPositionKy))}</th>
      <th class="num">${esc(L(pdf.colTotalRu, pdf.colTotalKy))}</th>
      <th class="num">${esc(L(pdf.colConfirmedRu, pdf.colConfirmedKy))}</th>
      <th class="num">${esc(L(pdf.colAcceptedRu, pdf.colAcceptedKy))}</th>
      <th class="num">${esc(L(pdf.colNoShowRu, pdf.colNoShowKy))}</th>
      <th class="num">${esc(L(pdf.colCancelledRu, pdf.colCancelledKy))}</th>
    </tr></thead>
    <tbody>${targetRows || `<tr><td colspan='7'>${esc(L(pdf.noDataRu, pdf.noDataKy))}</td></tr>`}</tbody>
  </table>`
    : "";

  const registryHtml = showRegistry
    ? `
  <h2>${esc(L(pdf.registryRu, pdf.registryKy))}</h2>
  <table class="${registryCompact ? "registry" : ""}">
    <thead><tr>
      <th>${esc(L(pdf.colNameRu, pdf.colNameKy))}</th>
      <th>${esc(L(pdf.colTopicRu, pdf.colTopicKy))}</th>
      <th>${esc(L("Адресат", "Адресат"))}</th>
      <th>${esc(L("Время приёма", "Кабыл алуу убактысы"))}</th>
      <th>${esc(L("Статус записи", "Жазылуу статусу"))}</th>
      <th>${esc(L(pdf.colStageRu, pdf.colStageKy))}</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan='6'>${esc(L(pdf.noDataRu, pdf.noDataKy))}</td></tr>`}</tbody>
  </table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(docTitle)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  body { font-family: "Segoe UI", "Times New Roman", Arial, sans-serif; color: #1a2332; padding: 0; font-size: 11px; line-height: 1.35; }
  h1 { font-size: 16px; margin: 0 0 4px; color: #0B1F3A; }
  h2 { font-size: 12px; margin: 14px 0 6px; color: #0B1F3A; border-bottom: 2px solid #B8954A; padding-bottom: 3px; }
  .meta { color: #5A6B7D; margin-bottom: 10px; font-size: 10px; }
  .kpis { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
  .kpi { border: 1px solid #D5DEE8; border-radius: 6px; padding: 6px 10px; min-width: 96px; }
  .kpi b { display: block; font-size: 16px; color: #0B1F3A; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #D5DEE8; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #F4F7FB; font-size: 10px; }
  td.num, th.num { text-align: center; }
  td.nowrap { white-space: nowrap; }
  table.registry { font-size: 9.5px; }
  table.registry th, table.registry td { padding: 3px 4px; }
  .foot { margin-top: 14px; color: #5A6B7D; font-size: 9px; }
  @media print {
    body { padding: 0; }
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">${esc(orgName)}<br/>${esc(subtitle)}<br/>${
    input.period
      ? `${esc(L(pdf.periodRu, pdf.periodKy))}: ${esc(periodLabel)}<br/>`
      : ""
  }${esc(L(pdf.generatedRu, pdf.generatedKy))}: ${esc(now)}</div>
  ${summaryHtml}
  ${registryHtml}
  <p class="foot">${esc(L(pdf.footRu, pdf.footKy))}</p>
</body>
</html>`;

  printHtmlDocument(html, L(pdf.popupHintRu, pdf.popupHintKy));
}

/** Имя файла при «Сохранить как PDF» берётся из &lt;title&gt;. */
function buildReportFileTitle(opts: {
  kind: ReportKind;
  periodLabel: string;
  lang: UiLang;
}): string {
  const date = new Date();
  const stamp = `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}.${date.getFullYear()}`;
  const kindPart =
    opts.kind === "summary"
      ? opts.lang === "ky"
        ? "jyiyintyk"
        : "svodka"
      : opts.kind === "registry"
        ? opts.lang === "ky"
          ? "reestr"
          : "reestr"
        : opts.lang === "ky"
          ? "toluk"
          : "polnyy";
  const periodSafe = (opts.periodLabel || "vse")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `Priyom-grazhdan_${kindPart}_${periodSafe || "vse"}_${stamp}`;
}

/** Только диалог печати в скрытом iframe — без скачивания и без новой вкладки. */
function printHtmlDocument(html: string, blockedHint: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "report-print");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error("no-doc");

    doc.open();
    doc.write(html);
    doc.close();

    const win = iframe.contentWindow;
    if (!win) throw new Error("no-win");

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* ignore */
      }
    };

    const runPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        alert(blockedHint);
      } finally {
        // Не удаляем сразу — диалог печати ещё открыт
        setTimeout(cleanup, 60_000);
      }
    };

    // Дождаться отрисовки документа в iframe
    if (doc.readyState === "complete") {
      setTimeout(runPrint, 250);
    } else {
      iframe.addEventListener("load", () => setTimeout(runPrint, 250));
      setTimeout(runPrint, 500);
    }
  } catch {
    alert(blockedHint);
  }
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
