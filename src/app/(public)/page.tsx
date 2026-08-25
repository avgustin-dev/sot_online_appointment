"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { EmblemKR } from "@/components/brand/Emblem";
import { appointmentStatusHref, evaluationHref } from "@/lib/ticketUrl";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import { formatDateRu } from "@/lib/slots";
import { mergeServiceContent, pickLocale } from "@/lib/serviceContent";
import { CourtContactsBlock } from "@/components/ui/CourtContactsBlock";
import { CitizenHubNav } from "@/components/layout/CitizenHubNav";

/**
 * Хаб раздела «Приём граждан руководством Верховного суда Кыргызской Республики»
 * UX-идеи: qabul.sud.uz (статус, код, статистика, оценка) + предмет приёма КР.
 */
export default function HomePage() {
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const router = useRouter();
  const { state, lookupByCode, recoverCodesByPhone } = useStore();

  const sc = mergeServiceContent(state.serviceContent);
  const hubTitle = pickLocale(isKy, sc.hubTitleRu, sc.hubTitleKy);
  const hubLead = pickLocale(isKy, sc.hubLeadRu, sc.hubLeadKy);
  const hubCta = pickLocale(isKy, sc.hubCtaRu, sc.hubCtaKy);
  const memoTitle = pickLocale(isKy, sc.memoTitleRu, sc.memoTitleKy);
  const memoItems = isKy
    ? sc.memoItemsKy?.length
      ? sc.memoItemsKy
      : sc.memoItemsRu
    : sc.memoItemsRu?.length
      ? sc.memoItemsRu
      : sc.memoItemsKy;
  const allowed = isKy
    ? sc.allowedKy?.length
      ? sc.allowedKy
      : sc.allowedRu
    : sc.allowedRu;
  const forbidden = isKy
    ? sc.forbiddenKy?.length
      ? sc.forbiddenKy
      : sc.forbiddenRu
    : sc.forbiddenRu;

  const [statusCode, setStatusCode] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusOk, setStatusOk] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    title: string;
    body: string;
    email?: string;
  } | null>(null);

  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverMsg, setRecoverMsg] = useState("");
  const [recoverCodes, setRecoverCodes] = useState<string[]>([]);
  const [rateCode, setRateCode] = useState("");

  async function onCheckStatus(e: React.FormEvent) {
    e.preventDefault();
    setStatusOk(false);
    setStatusMsg("");
    setStatusNotice(null);
    const found = await lookupByCode(statusCode);
    if (!found) {
      setStatusMsg(
        isKy
          ? "Код боюнча жазылуу табылган жок."
          : "Запись с таким кодом не найдена."
      );
      return;
    }
    const { appointment, appeal } = found;
    const stage = appeal
      ? t.stages[appeal.stage] || appeal.stage
      : t.statuses[appointment.status] || appointment.status;
    setStatusOk(true);
    setStatusMsg(
      isKy
        ? `${appointment.code}: ${formatDateRu(appointment.date)}, ${appointment.slotStart}–${appointment.slotEnd}. Абалы: ${stage}.`
        : `${appointment.code}: ${formatDateRu(appointment.date)}, ${appointment.slotStart}–${appointment.slotEnd}. Статус: ${stage}.`
    );
    const latest = appeal?.notifications?.[0];
    if (latest) {
      setStatusNotice({
        title: latest.title,
        body: latest.body,
        email: appointment.email,
      });
    }
  }

  async function onRecover(e: React.FormEvent) {
    e.preventDefault();
    setRecoverMsg("");
    setRecoverCodes([]);
    const codes = await recoverCodesByPhone(recoverPhone);
    if (!codes.length) {
      setRecoverMsg(
        isKy
          ? "Бул телефон боюнча жазылуу табылган жок."
          : "По этому телефону активных записей не найдено."
      );
      return;
    }
    setRecoverCodes(codes);
    setRecoverMsg(
      isKy
        ? "PIN — жазылуу ырастоосунда (талон / кат)."
        : "PIN указан в подтверждении записи (талон или письмо)."
    );
  }

  return (
    <div className="bg-court-mist">
      {/* Hero раздела */}
      <section className="border-b border-court-line bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center md:px-6 md:py-12">
          <EmblemKR size={72} priority className="mx-auto" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-court-muted">
            {pickLocale(isKy, sc.orgNameRu, sc.orgNameKy)}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-court-navy sm:text-3xl">
            {hubTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-left text-sm leading-relaxed text-court-ink sm:text-base sm:text-center">
            {hubLead}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-left text-xs leading-relaxed text-court-muted sm:text-center sm:text-sm">
            {pickLocale(isKy, sc.hubKickerRu, sc.hubKickerKy)}
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-lg border border-court-line bg-court-mist/50 p-5 text-left shadow-sm">
            <div className="text-sm text-center font-semibold text-court-navy">
              {isKy
                ? "Жеке кабыл алууга жазылуу"
                : "Электронная запись на личный приём"}
            </div>

            <Link
              href={routes.appointment}
              className="btn-primary mt-4 w-full !py-2.5"
            >
              {hubCta}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 md:px-6 md:py-8">
        {/* Порядок */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-court-ink sm:px-5">
          <div className="font-semibold text-amber-900">{memoTitle}</div>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-amber-950/90">
            {(memoItems?.length ? memoItems : []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <CourtContactsBlock isKy={isKy} showSchedule />
        <CitizenHubNav />

        <div className="grid gap-4 lg:grid-cols-1">
          <div className="space-y-4">
            <div className="rounded-lg border border-court-line bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-court-navy">
                {isKy
                  ? "Кайрылуунун абалын текшерүү"
                  : "Проверка состояния обращения"}
              </h2>
              <p className="mt-1 text-xs text-court-muted">
                  {isKy
                    ? "Жазылуу кодун киргизиңиз."
                    : "Введите код записи, указанный при подтверждении."}
              </p>
              <form onSubmit={onCheckStatus} className="mt-3 space-y-2">
                <input
                  className="input font-mono uppercase"
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value)}
                  placeholder="VS-2026-...."
                />
                <button type="submit" className="btn-primary w-full !py-2">
                  {isKy ? "Текшерүү" : "Проверить"}
                </button>
              </form>
              {statusMsg && (
                <div className="mt-3 space-y-2">
                  <p
                    className={`text-sm ${statusOk ? "text-emerald-800" : "text-rose-800"}`}
                  >
                    {statusMsg}
                  </p>
                  {statusOk && statusNotice && (
                    <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        {isKy ? "Билдирме" : "Уведомление"}
                      </div>
                      <div className="mt-0.5 font-semibold">
                        {statusNotice.title}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed">
                        {statusNotice.body}
                      </p>
                      {statusNotice.email ? (
                        <p className="mt-1.5 text-[11px] text-sky-800">
                          {isKy
                            ? `Почта: ${statusNotice.email}`
                            : `Направлено на почту: ${statusNotice.email}`}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {statusOk && (
                    <Link
                      href={appointmentStatusHref(statusCode)}
                      className="inline-block text-sm font-medium text-court-blue hover:underline"
                    >
                      {isKy
                        ? "Толук башкаруу (PIN менен) →"
                        : "Управление записью (нужен PIN) →"}
                    </Link>
                  )}
                </div>
              )}
              <Link
                href={routes.appointmentStatus}
                className="mt-2 inline-block text-xs font-medium text-court-blue hover:underline"
              >
                {isKy
                  ? "Код жана PIN менен кирүү →"
                  : "Вход по коду и PIN →"}
              </Link>
            </div>

            <div className="rounded-lg border border-court-line bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-court-navy">
                {isKy ? "Кодду калыбына келтирүү" : "Восстановление кода"}
              </h2>
              <form onSubmit={onRecover} className="mt-3 space-y-2">
                <input
                  className="input"
                  value={recoverPhone}
                  onChange={(e) => setRecoverPhone(e.target.value)}
                  placeholder="+996 XXX XXX XXX"
                />
                <button type="submit" className="btn-outline w-full !py-2">
                  {isKy ? "Кодду табуу" : "Найти код"}
                </button>
              </form>
              {recoverMsg && (
                <p className="mt-2 text-sm text-court-ink">{recoverMsg}</p>
              )}
              {recoverCodes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {recoverCodes.map((c) => (
                    <li key={c}>
                      <Link
                        href={appointmentStatusHref(c)}
                        className="font-mono text-sm font-semibold text-court-blue hover:underline"
                      >
                        {c}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-court-line bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-court-navy">
                {isKy
                  ? "Сервисти баалоо"
                  : "Оценка сервиса записи и приёма"}
              </h2>
              <p className="mt-1 text-xs text-court-muted">
                {isKy
                  ? "Электрондук жазылуунун ыңгайлуулугу жана коомдук кабыл алуунун иши. Каттоо кодун киргизиңиз."
                  : "Удобство электронной записи и качество работы общественной приёмной. Введите регистрационный код записи."}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (rateCode.trim()) {
                    router.push(evaluationHref(rateCode));
                  }
                }}
                className="mt-3 space-y-2"
              >
                <input
                  className="input font-mono uppercase"
                  value={rateCode}
                  onChange={(e) => setRateCode(e.target.value)}
                  placeholder="VS-2026-...."
                />
                <button type="submit" className="btn-outline w-full !py-2">
                  {isKy ? "Баалоого өтүү" : "Перейти к оценке"}
                </button>
              </form>
              <Link
                href={routes.evaluation}
                className="mt-2 inline-block text-xs font-medium text-court-blue hover:underline"
              >
                {isKy ? "Бөлүм жөнүндө →" : "Подробнее об оценке →"}
              </Link>
            </div>
          </div>
        </div>

        {/* Предмет приёма */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-court-line bg-white p-5">
            <h3 className="font-semibold text-court-success">
              {pickLocale(isKy, sc.allowedTitleRu, sc.allowedTitleKy) ||
                t.home.allowed}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-court-ink">
              {allowed.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-court-line bg-white p-5">
            <h3 className="font-semibold text-court-danger">
              {pickLocale(isKy, sc.forbiddenTitleRu, sc.forbiddenTitleKy) ||
                t.home.forbidden}
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-court-ink">
              {forbidden.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
