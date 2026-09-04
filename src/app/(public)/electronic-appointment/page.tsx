"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Printer,
  Scale,
} from "lucide-react";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { VisitTicket } from "@/components/booking/VisitTicket";
import { WizardSteps } from "@/components/ui/WizardSteps";
import { PageLoader } from "@/components/ui/PageLoader";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import type { AppealCategory } from "@/lib/types";
import { APPLICANT_TYPES } from "@/lib/constants";
import {
  BOOKING_RULES,
  cloneEligibilityTree,
  getLeaf,
  getPathRefusal,
  isPathAllowed,
  resolvePath,
  type EligibilityNode,
  type RefusalMessage,
} from "@/lib/eligibility";
import { bookableTargets } from "@/lib/targets";
import { mergeServiceContent, pickLocale } from "@/lib/serviceContent";
import { saveMyBookingRef } from "@/lib/myBooking";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { isCompleteKgPhone } from "@/lib/phoneMask";

function RadioBlock({
  name,
  options,
  value,
  isKy,
  onChange,
}: {
  name: string;
  options: EligibilityNode[];
  value: string;
  isKy: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {options.map((opt) => (
        <li key={opt.id}>
          <label className="flex cursor-pointer items-start gap-2.5 rounded border border-transparent px-2 py-1.5 text-[15px] leading-snug hover:bg-court-mist">
            <input
              type="radio"
              name={name}
              className="mt-1 h-4 w-4 shrink-0 accent-court-blue"
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
            />
            <span>{isKy ? opt.labelKy : opt.labelRu}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function RefusalBlock({
  msg,
  isKy,
  orgName,
}: {
  msg: RefusalMessage;
  isKy: boolean;
  orgName: string;
}) {
  const greeting = isKy ? msg.greetingKy : msg.greetingRu;
  const body = isKy ? msg.bodyKy : msg.bodyRu;
  const closing = isKy ? msg.closingKy : msg.closingRu;
  return (
    <div className="mt-6 rounded-lg border border-court-line bg-court-mist px-4 py-5 sm:px-6">
      <div className="mb-3 flex items-center gap-2 text-court-navy">
        <Scale className="h-4 w-4 text-court-gold" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {orgName}
        </span>
      </div>
      <p className="text-center text-[15px] font-semibold">{greeting}</p>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="mt-5 text-center text-[15px] font-medium">{closing}</p>
    </div>
  );
}

/**
 * Запись: правила + допуск (KZ) + правдоподобные поля (UX УЗ) + слоты 20 мин (КР).
 * Без полей судебного дела.
 */
export default function BookPage() {
  const { ready, bookAppointment, state } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  const sc = mergeServiceContent(state.serviceContent);
  const rules = sc.rules ?? BOOKING_RULES;
  const eligibilityTree = (state.eligibilityTree?.length
    ? state.eligibilityTree
    : cloneEligibilityTree()) as EligibilityNode[];
  const bookTitle = isKy
    ? sc.bookTitleKy || sc.bookTitleRu
    : sc.bookTitleRu || sc.bookTitleKy;
  const bookSubtitle = isKy
    ? sc.bookSubtitleKy || sc.bookSubtitleRu
    : sc.bookSubtitleRu || sc.bookSubtitleKy;

  const STEPS = useMemo(
    () =>
      isKy
        ? ["Эрежелер", "Допуск", "Жеке маалымат", "Дарек", "Мазмун", "Убакыт"]
        : ["Правила", "Допуск", "Заявитель", "Адрес", "Обращение", "Дата и время"],
    [isKy]
  );

  const [step, setStep] = useState(0);
  const [rulesAgree, setRulesAgree] = useState(false);
  const [path, setPath] = useState<string[]>([]);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState("+996 ");
  const [email, setEmail] = useState("");
  const [applicantType, setApplicantType] = useState("citizen");

  const [region, setRegion] = useState("");
  const [locality, setLocality] = useState("");
  const [street, setStreet] = useState("");

  const [target, setTarget] = useState("");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<AppealCategory>("organization");
  const [description, setDescription] = useState("");
  const [companion, setCompanion] = useState("");
  const [companionPhone, setCompanionPhone] = useState("");
  const [companion2, setCompanion2] = useState("");
  const [companion2Phone, setCompanion2Phone] = useState("");

  const [date, setDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    code: string;
    pin: string;
    date: string;
    slotStart: string;
    slotEnd: string;
    targetId: string;
  } | null>(null);

  const pathNodes = resolvePath(path, eligibilityTree);
  const leaf = getLeaf(path, eligibilityTree);
  const refusalMsg = getPathRefusal(path, eligibilityTree);
  const blocked = Boolean(refusalMsg);
  const canProceedEligibility = isPathAllowed(path, eligibilityTree);

  const fullName = [lastName, firstName, middleName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");

  if (!ready) {
    return <PageLoader label={t.common.loading} />;
  }

  function L(ru: string, ky: string) {
    return isKy ? ky : ru;
  }

  function labelOf(n: { labelRu: string; labelKy: string }) {
    return isKy ? n.labelKy : n.labelRu;
  }

  function pickLevel(levelIndex: number, id: string) {
    setError("");
    setPath((prev) => {
      const next = prev.slice(0, levelIndex);
      next[levelIndex] = id;
      return next;
    });
  }

  const levels: {
    title: string;
    options: EligibilityNode[];
    levelIndex: number;
  }[] = [];

  levels.push({
    title: L(
      "1. Выберите категорию вопроса для записи на приём:",
      "1. Кабыл алууга жазылуу үчүн категорияны тандаңыз:"
    ),
    options: eligibilityTree,
    levelIndex: 0,
  });

  for (let i = 0; i < pathNodes.length; i++) {
    const node = pathNodes[i];
    if (!node.children?.length) break;
    const qNum = i + 2;
    const title =
      i === 0
        ? L(
            "2. Уточните суть вопроса:",
            "2. Маселени тактаңыз:"
          )
        : `${qNum}. ${labelOf(node)}:`;
    levels.push({
      title,
      options: node.children,
      levelIndex: i + 1,
    });
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !rulesAgree) {
      return L(
        "Подтвердите согласие с Правилами записи.",
        "Жазылуу Эрежелерине макулдук керек."
      );
    }
    if (s === 1) {
      if (path.length === 0)
        return L("Выберите категорию.", "Категорияны тандаңыз.");
      if (blocked)
        return L(
          "По выбранному варианту запись невозможна.",
          "Бул вариант боюнча жазылуу мүмкүн эмес."
        );
      if (!canProceedEligibility)
        return L(
          "Выберите вариант до конца.",
          "Вариантты аягына чейин тандаңыз."
        );
    }
    if (s === 2) {
      if (!lastName.trim() || !firstName.trim())
        return L(
          "Укажите фамилию и имя заявителя.",
          "Кайрылуучунун фамилиясы менен атын жазыңыз."
        );
      if (!phone.trim() || !isCompleteKgPhone(phone))
        return L(
          "Укажите корректный номер телефона заявителя.",
          "Кайрылуучунун телефон номерин туура киргизиңиз."
        );
    }
    if (s === 3) {
      if (!region.trim() || !locality.trim() || !street.trim())
        return L(
          "Укажите адрес места проживания / нахождения заявителя.",
          "Кайрылуучунун жашаган/турган дарегин көрсөтүңүз."
        );
    }
    if (s === 4) {
      if (!target)
        return L(
          "Укажите должностное лицо, к которому записываетесь.",
          "Кимге жазыла турганыңызды көрсөтүңүз."
        );
      if (!topic.trim())
        return L(
          "Укажите тему обращения.",
          "Кайрылуунун темасын жазыңыз."
        );
      if (!description.trim() || description.trim().length < 20)
        return L(
          "Изложите содержание обращения (не менее 20 символов).",
          "Кайрылуунун мазмунун жазыңыз (20 белгиден кем эмес)."
        );
      if (!agree)
        return L(
          "Подтвердите соответствие предмета обращения правилам приёма.",
          "Кайрылуунун предмети эрежелерге туура келерин ырастаңыз."
        );
    }
    if (s === 5 && (!date || !slotStart)) {
      return L(
        "Выберите дату и время приёма.",
        "Күн жана убакытты тандаңыз."
      );
    }
    return null;
  }

  function next() {
    setError("");
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    if (step === 1 && leaf?.allowed) {
      setCategory(leaf.category || "other");
      const auto = isKy ? leaf.topicKy : leaf.topicRu;
      if (auto && !topic) setTopic(auto);
    }
    setStep((x) => Math.min(5, x + 1));
  }

  function back() {
    setError("");
    setStep((x) => Math.max(0, x - 1));
  }

  async function onSubmit() {
    setError("");
    const err = validateStep(5);
    if (err) {
      setError(err);
      return;
    }
    const pathNote = pathNodes.map(labelOf).join(" → ");
    const typeLabel =
      APPLICANT_TYPES.find((r) => r.id === applicantType)?.[
        isKy ? "ky" : "ru"
      ] || applicantType;

    const companions = [
      companion.trim()
        ? { fullName: companion.trim(), phone: companionPhone.trim() }
        : null,
      companion2.trim()
        ? { fullName: companion2.trim(), phone: companion2Phone.trim() }
        : null,
    ].filter((c): c is { fullName: string; phone: string } => Boolean(c));

    const appendix = [
      typeLabel && `Тип заявителя: ${typeLabel}`,
      pathNote && `Допуск: ${pathNote}`,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await bookAppointment({
      fullName,
      phone,
      email,
      topic,
      region,
      locality,
      street,
      category,
      description: [description.trim(), appendix].filter(Boolean).join("\n\n"),
      date,
      slotStart,
      slotEnd,
      targetId: target,
      companions,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult({
      code: res.appointment.code,
      pin: res.pin,
      date: res.appointment.date,
      slotStart: res.appointment.slotStart,
      slotEnd: res.appointment.slotEnd,
      targetId: res.appointment.targetId,
    });
    // Код и PIN сохраняются в этом браузере, чтобы поля на /appointment-status
    // были заполнены заранее, даже если гражданин случайно закроет страницу.
    saveMyBookingRef({ code: res.appointment.code, pin: res.pin });
  }

  if (result) {
    return (
      <div className="print-ticket-root mx-auto max-w-lg px-4 py-12">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-sky-700" />
          <div>
            <h1 className="text-lg font-semibold text-court-navy">
              {t.book.success}
            </h1>
            <p className="mt-1 text-sm text-sky-950">{t.book.successLead}</p>
          </div>
        </div>
        <VisitTicket
          code={result.code}
          pin={result.pin}
          fullName={fullName}
          date={result.date}
          slotStart={result.slotStart}
          slotEnd={result.slotEnd}
          targetId={result.targetId}
          pending
          isKy={isKy}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2 no-print">
          <button
            type="button"
            className="btn-outline"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            {t.book.printSlip}
          </button>
          <Link
            href={routes.appointmentStatusByCode(result.code)}
            className="btn-primary"
          >
            {t.book.manage}
          </Link>
          <Link href="/" className="btn-outline">
            {t.book.toHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter bg-court-mist min-h-[70vh]">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
        <Breadcrumbs
          items={[
            { label: t.crumbs.home, href: "/" },
            { label: t.crumbs.book },
          ]}
        />

        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-court-navy sm:text-2xl">
            {bookTitle ||
              L(
                "Электронная запись на личный приём",
                "Жеке кабыл алууга электрондук жазылуу"
              )}
          </h1>
          <p className="mt-1 text-sm font-medium text-court-ink">
            {bookSubtitle ||
              L(
                "Верховный суд Кыргызской Республики",
                "Кыргыз Республикасынын Жогорку соту"
              )}
          </p>
          <p className="mt-0.5 text-xs text-court-muted">
            {L(
              "Приём граждан руководством в установленном порядке",
              "Жетекчилик тарабынан жарандарды белгиленген тартипте кабыл алуу"
            )}
          </p>
        </div>

        <div className="mb-6">
          <WizardSteps steps={STEPS} current={step} mode="dots" />
        </div>

        <div className="rounded-lg border border-court-line bg-white p-5 shadow-sm sm:p-6">
          <div key={step} className="wizard-step-enter">
          {/* 0 Правила */}
          {step === 0 && (
            <div className="space-y-4 text-sm leading-relaxed text-court-ink">
              <p>{L(rules.welcomeRu, rules.welcomeKy)}</p>
              <h2 className="text-center text-xs font-bold uppercase tracking-wide text-court-navy">
                {L(rules.titleRu, rules.titleKy)}
              </h2>
              <ol className="list-decimal space-y-1.5 pl-5">
                {(
                  (isKy ? rules.rulesKy : rules.rulesRu) ??
                  (isKy ? BOOKING_RULES.rulesKy : BOOKING_RULES.rulesRu)
                ).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="font-semibold text-amber-900">
                  {L(rules.cannotTitleRu, rules.cannotTitleKy)}
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-950/90">
                  {(
                    (isKy ? rules.cannotKy : rules.cannotRu) ??
                    (isKy ? BOOKING_RULES.cannotKy : BOOKING_RULES.cannotRu)
                  ).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <p className="font-medium text-court-danger">
                {L(rules.deleteNoteRu, rules.deleteNoteKy)}
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded border border-court-line px-3 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-court-blue"
                  checked={rulesAgree}
                  onChange={(e) => setRulesAgree(e.target.checked)}
                />
                <span>
                  {L(rules.agreeRu, rules.agreeKy)}{" "}
                  <span className="text-court-danger">*</span>
                </span>
              </label>
            </div>
          )}

          {/* 1 Допуск KZ */}
          {step === 1 && (
            <div className="space-y-5">
              {levels.map((lvl) => (
                <div key={lvl.levelIndex}>
                  <h2 className="mb-2 text-sm font-semibold text-court-ink">
                    {lvl.title} <span className="text-court-danger">*</span>
                  </h2>
                  <RadioBlock
                    name={`elig-${lvl.levelIndex}`}
                    options={lvl.options}
                    value={path[lvl.levelIndex] || ""}
                    isKy={isKy}
                    onChange={(id) => pickLevel(lvl.levelIndex, id)}
                  />
                </div>
              ))}
              {blocked && refusalMsg && (
                <RefusalBlock msg={refusalMsg} isKy={isKy} orgName={t.orgName} />
              )}
            </div>
          )}

          {/* 2 Заявитель */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-court-navy">
                {L(
                  "Сведения о заявителе",
                  "Кайрылуучу жөнүндө маалымат"
                )}
              </h2>
              <p className="text-xs text-court-muted">
                {L(
                  "Указываются данные лица, которое явится на приём. Сведения заполняются полностью и достоверно.",
                  "Кабыл алууга келе турган адамдын маалыматтары толук жана туура толтурулат."
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="label">
                    {L("Фамилия", "Фамилия")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <input
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Имя", "Аты")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <input
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Отчество", "Атасынын аты")}
                  </label>
                  <input
                    className="input"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    autoComplete="additional-name"
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Контактный телефон", "Байланыш телефону")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Адрес электронной почты", "Электрондук почта")}
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mail@example.com"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label">
                    {L("Категория заявителя", "Кайрылуучунун категориясы")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <select
                    className="input"
                    value={applicantType}
                    onChange={(e) => setApplicantType(e.target.value)}
                  >
                    {APPLICANT_TYPES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {isKy ? r.ky : r.ru}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 3 Адрес */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-court-navy">
                {L(
                  "Место проживания / нахождения заявителя",
                  "Кайрылуучунун жашаган / турган жери"
                )}
              </h2>
              {fullName && (
                <div className="rounded border border-court-line bg-court-mist px-3 py-2 text-sm">
                  <span className="text-xs uppercase text-court-muted">
                    {L("Заявитель", "Кайрылуучу")}:
                  </span>{" "}
                  <strong className="text-court-navy">{fullName}</strong>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {L("Регион (область / город)", "Аймак (облус / шаар)")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <input
                    className="input"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Населённый пункт", "Калктуу пункт")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <input
                    className="input"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder={L("город, село, посёлок", "шаар, айыл")}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">
                    {L("Улица / микрорайон", "Көчө / кичи район")}{" "}
                    <span className="text-court-danger">*</span>
                  </label>
                  <input
                    className="input"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4 Содержание (без дела!) */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-court-navy">
                {L("Сведения об обращении", "Кайрылуу жөнүндө маалымат")}
              </h2>
              {fullName && (
                <div className="rounded border border-court-line bg-court-mist px-3 py-2 text-sm">
                  <div>
                    <span className="text-xs uppercase text-court-muted">
                      {L("Заявитель", "Кайрылуучу")}:
                    </span>{" "}
                    <strong className="text-court-navy">{fullName}</strong>
                  </div>
                  <div className="mt-0.5 text-xs text-court-muted">{phone}</div>
                </div>
              )}
              {pathNodes.length > 0 && (
                <div className="rounded border border-court-line bg-court-mist px-3 py-2 text-xs text-court-muted">
                  <span className="font-medium text-court-navy">
                    {L("Результат проверки допуска:", "Допуск текшерүүсү:")}
                  </span>{" "}
                  {pathNodes.map(labelOf).join(" → ")}
                </div>
              )}
              <div>
                <label className="label font-bold">
                  {L(
                    "К должностному лицу / подразделению",
                    "Кызмат адамы / бөлүм"
                  )}{" "}
                  <span className="text-court-danger">*</span>
                </label>
                <select
                  className="input font-bold"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setDate("");
                    setSlotStart("");
                    setSlotEnd("");
                  }}
                >
                  <option value="">
                    {L("Выберите", "Тандаңыз")}
                  </option>
                  {bookableTargets(sc).map((r) => (
                    <option key={r.id} value={r.id}>
                      {pickLocale(isKy, r.bookLabelRu, r.bookLabelKy)}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-court-muted">
                  {pickLocale(isKy, sc.bookTargetHintRu, sc.bookTargetHintKy)}{" "}
                  {pickLocale(
                    isKy,
                    sc.contacts.receptionOfficeRu,
                    sc.contacts.receptionOfficeKy
                  )}
                  . {isKy ? "Ишеним телефону" : "Телефон доверия"}:{" "}
                  {sc.contacts.trustPhone}.{" "}
                  <Link href={routes.rules} className="text-court-blue hover:underline">
                    {L("Подробнее", "Толугураак")}
                  </Link>
                </p>
              </div>
              <div>
                <label className="label">
                  {L("Тема обращения", "Кайрылуунун темасы")}{" "}
                  <span className="text-court-danger">*</span>
                </label>
                <input
                  className="input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t.book.topicPh}
                />
              </div>
              <div>
                <label className="label">
                  {L(
                    "Содержание обращения (без указания конкретных судебных дел и актов)",
                    "Кайрылуунун мазмуну (конкреттүү сот иштери жана актылары көрсөтүлбөстөн)"
                  )}{" "}
                  <span className="text-court-danger">*</span>
                </label>
                <textarea
                  className="input min-h-[120px] resize-y"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value.slice(0, 2000))
                  }
                  placeholder={t.book.descriptionPh}
                />
                <p className="mt-1 text-xs text-court-muted">
                  {description.length}/2000
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {L(
                      "Сопровождающий 1 (ФИО)",
                      "Коштоочу 1 (ФИО)"
                    )}
                  </label>
                  <input
                    className="input"
                    value={companion}
                    onChange={(e) => setCompanion(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Телефон сопровождающего 1", "Коштоочу 1 телефону")}
                  </label>
                  <PhoneInput
                    value={companionPhone}
                    onChange={setCompanionPhone}
                  />
                </div>
                <div>
                  <label className="label">
                    {L(
                      "Сопровождающий 2 (ФИО, не более двух)",
                      "Коштоочу 2 (эки адамдан көп эмес)"
                    )}
                  </label>
                  <input
                    className="input"
                    value={companion2}
                    onChange={(e) => setCompanion2(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    {L("Телефон сопровождающего 2", "Коштоочу 2 телефону")}
                  </label>
                  <PhoneInput
                    value={companion2Phone}
                    onChange={setCompanion2Phone}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-medium">
                  {L(
                    "На личном приёме не рассматриваются конкретные судебные дела, законность судебных актов и результаты рассмотрения дел. Независимость судей обеспечивается в полном объёме.",
                    "Жеке кабыл алууда конкреттүү сот иштери, сот актыларынын мыйзамдуулугу жана иштерди кароонун натыйжалары талкууланбайт. Соттордун көз карандысыздыгы толук сакталат."
                  )}
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded border border-court-line px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-court-blue"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>{t.book.agree}</span>
              </label>
            </div>
          )}

          {/* 5 Календарь */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-court-navy">
                {t.book.calendarTitle}
              </h2>
              {fullName && (
                <div className="rounded border border-court-line bg-court-mist px-3 py-2 text-sm">
                  <span className="text-xs uppercase text-court-muted">
                    {L("Заявитель", "Кайрылуучу")}:
                  </span>{" "}
                  <strong className="text-court-navy">{fullName}</strong>
                  {topic && (
                    <span className="block text-xs text-court-muted mt-0.5">
                      {L("Тема", "Тема")}: {topic}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-court-muted">{t.book.calendarLead}</p>
              <SlotPicker
                date={date}
                slotStart={slotStart}
                onDateChange={setDate}
                onSlotChange={(s, e) => {
                  setSlotStart(s);
                  setSlotEnd(e);
                }}
                targetId={target}
              />
            </div>
          )}
          </div>

          {error && (
            <div className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-court-line pt-5">
            <button
              type="button"
              className="btn-outline"
              onClick={back}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              {L("Назад", "Артка")}
            </button>
            {step === 1 && blocked ? null : step < 5 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={next}
                disabled={step === 1 && !canProceedEligibility}
              >
                {L("Следующий", "Кийинки")}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onSubmit}>
                {t.book.submit}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-court-muted">
          <Link href="/" className="text-court-blue hover:underline">
            {L("← На главную раздела", "← Бөлүмдүн башкы бетине")}
          </Link>
          {" · "}
          <Link href={routes.rules} className="text-court-blue hover:underline">
            {L("Правила", "Эрежелер")}
          </Link>
          {" · "}
          <Link
            href={routes.appointmentStatus}
            className="text-court-blue hover:underline"
          >
            {L("Моя запись", "Менин жазылууум")}
          </Link>
        </p>
      </div>
    </div>
  );
}
