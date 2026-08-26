"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { useStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Collapsible } from "@/components/ui/Collapsible";
import { FaqSection } from "@/components/staff/FaqSection";

/**
 * Служебная инструкция: официальный стиль, без разговорных формулировок.
 */
export default function AdminHelpPage() {
  const { t, lang } = useI18n();
  const { currentUser } = useStore();
  const isKy = lang === "ky";
  const faqDefaultRole = currentUser?.role ?? "reception";

  return (
    <div className="mx-auto max-w-3xl space-y-5 page-enter">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: isKy ? "Нускама" : "Инструкция" },
        ]}
      />

      <div>
        <h1 className="section-title">
          {isKy
            ? "Кызматтык нускама"
            : "Служебная инструкция"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isKy
            ? "Тартиби жарандарды жетекчилик тарабынан кабыл алуунун электрондук сервисинде. Кыска, тартип боюнча."
            : "Порядок работы в электронной системе приёма граждан руководством Верховного суда Кыргызской Республики."}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <p className="font-semibold text-slate-900">
          {isKy ? "Негизги бөлүштүрүү" : "Основное разделение"}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>
            {isKy
              ? "Жарандар: ачык сайт (жазылуу, статус, башкаруу жазылуу, баалоо)."
              : "Граждане: публичный раздел (запись, статус обращения, управление записью, оценка сервиса)."}
          </li>
          <li>
            {isKy
              ? "Кызматкерлер: /admin — кароо, даярдоо, кабыл алуу, көзөмөл."
              : "Сотрудники: /admin — рассмотрение, подготовка, приём, контроль исполнения."}
          </li>
          <li>
            {isKy
              ? "Жазылуудан кийин берилет: каттоо коду жана PIN-код."
              : "После регистрации записи выдаются: регистрационный код и PIN-код."}
          </li>
        </ul>
      </div>

      <Collapsible
        title={
          isKy
            ? "1. Жарандын аракеттери"
            : "1. Действия гражданина"
        }
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            {isKy ? (
              <>
                Жазылуу:{" "}
                <Link href={routes.appointment} className="font-medium text-court-blue">
                  {routes.appointment}
                </Link>
                {" "}
                (эрежелер → допуск → маалымат → күн жана убакыт).
              </>
            ) : (
              <>
                Запись на приём:{" "}
                <Link href={routes.appointment} className="font-medium text-court-blue">
                  {routes.appointment}
                </Link>
                {" "}
                (правила → проверка допуска → сведения → дата и время).
              </>
            )}
          </li>
          <li>
            {isKy
              ? "Өтүнмө кароого кабыл алынат. Жазылуу ырасталгандан кийин күчүнө кирет; жаранга билдирүү жөнөтүлөт."
              : "Заявка принимается к рассмотрению. Запись вступает в силу после подтверждения; заявителю направляется уведомление."}
          </li>
          <li>
            {isKy
              ? "Берилет: каттоо коду (формат VS-ГГГГ-XXXX) жана PIN-код (төрт сан)."
              : "Выдаются: регистрационный код (формат VS-ГГГГ-XXXX) и PIN-код (четыре цифры)."}
          </li>
          <li>
            {isKy
              ? "Статусту текшерүү (башкы бет): гана каттоо коду. PIN-код талап кылынбайт."
              : "Проверка статуса (главная страница): только регистрационный код. PIN-код не требуется."}
          </li>
          <li>
            {isKy
              ? "Жазылууну которуу же жокко чыгаруу («Менин жазылууум»): каттоо коду жана PIN-код."
              : "Перенос или отмена записи («Моя запись»): регистрационный код и PIN-код."}
          </li>
          <li>
            {isKy
              ? `Сервисти баалоо: ${routes.evaluation}, каттоо коду боюнча.`
              : `Оценка сервиса: ${routes.evaluation}, по регистрационному коду.`}
          </li>
        </ol>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "2. Каттоо коду жана PIN-код"
            : "2. Регистрационный код и PIN-код"
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">
            {isKy ? "Кайда көрүнөт (кызматтык кабинет)" : "Где отображается (служебный кабинет)"}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <Link
                href="/admin/appeals"
                className="font-medium text-court-blue"
              >
                {isKy ? "Кайрылуулар" : "Обращения"}
              </Link>
              {isKy
                ? " — тилке «PIN»."
                : " — колонка «PIN»."}
            </li>
            <li>
              {isKy
                ? "Карточка кайрылуунун — блок «Каттоо коду» жана «PIN-код»."
                : "Карточка обращения — блок «Регистрационный код» и «PIN-код»."}
            </li>
            <li>
              {isKy
                ? "Календарь — жазылуу сабында PIN."
                : "Календарь — PIN в строке записи."}
            </li>
            <li>
              {isKy
                ? "Издөө: код, ФИО, телефон, PIN."
                : "Поиск: код, ФИО, телефон, PIN."}
            </li>
          </ul>
          <table className="mt-2 w-full border border-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2">
                  {isKy ? "Операция" : "Операция"}
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  {isKy ? "Талап кылынат" : "Требуется"}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2">
                  {isKy
                    ? "Статусту текшерүү (башкы бет)"
                    : "Проверка статуса (главная)"}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 font-medium">
                  {isKy ? "код" : "код"}
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2">
                  {isKy
                    ? "Которуу / жокко чыгаруу"
                    : "Перенос / отмена записи"}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 font-medium">
                  {isKy ? "код + PIN" : "код + PIN"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  {isKy ? "Баалоо" : "Оценка сервиса"}
                </td>
                <td className="px-3 py-2 font-medium">
                  {isKy ? "код" : "код"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {isKy
              ? "PIN-код — жашыруун маалымат. Жаранга суроо-талап боюнча гана берилет."
              : "PIN-код является конфиденциальным. Сообщается гражданину по обоснованному запросу."}
          </p>
        </div>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "3. Этаптар (кызматкер)"
            : "3. Этапы работы сотрудника"
        }
      >
        <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-700">
          <li>
            <strong>
              {isKy ? "Өтүнмөлөрдү кароо" : "Рассмотрение заявок"}
            </strong>
            <br />
            <Link href="/admin/inbox" className="text-court-blue">
              {isKy ? "Өтүнмөлөр" : "Заявки на проверке"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Ырастоо же баш тартуу. Жазылуу ырасталгандан кийин күчүнө кирет."
                : "Подтверждение либо отказ. Запись вступает в силу после подтверждения."}
            </span>
          </li>
          <li>
            <strong>
              {isKy ? "Каттоо жана карточка" : "Регистрация и карточка"}
            </strong>
            <br />
            <Link href="/admin" className="text-court-blue">
              {isKy ? "Иш тактасы" : "Рабочий стол"}
            </Link>
            {" · "}
            <Link href="/admin/calendar" className="text-court-blue">
              {isKy ? "Календарь" : "Календарь"}
            </Link>
            {" · "}
            <Link href="/admin/appeals" className="text-court-blue">
              {isKy ? "Кайрылуулар" : "Обращения"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Жазылуунун маалыматтарын жана карточканы карап чыгуу."
                : "Просмотр сведений о записи и открытие электронной карточки."}
            </span>
          </li>
          <li>
            <strong>
              {isKy ? "Алдын ала изилдөө (этап 2)" : "Предварительное изучение (этап 2)"}
            </strong>
            <br />
            <Link href="/admin/reception" className="text-court-blue">
              {isKy ? "Даярдоо / кабыл алуу" : "Подготовка и приём"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Изучение, кыскача мазмун, этап «кабыл алууга даяр». Конкреттүү сот иштери каралбайт."
                : "Изучение, краткое содержание, перевод в этап «готово к приёму». Конкретные судебные дела не рассматриваются."}
            </span>
          </li>
          <li>
            <strong>
              {isKy ? "Жеке кабыл алуу (этап 3)" : "Личный приём (этап 3)"}
            </strong>
            <br />
            <Link href="/admin/reception" className="text-court-blue">
              {isKy ? "Кабыл алуу" : "Подготовка и приём"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Протокол: кайрылуунун маңызы, түшүндүрмө, тапшырма, жооптуу адам."
                : "Протокол: существо обращения, разъяснение, поручение, ответственное лицо."}
            </span>
          </li>
          <li>
            <strong>
              {isKy ? "Көзөмөл (этап 4)" : "Контроль исполнения (этап 4)"}
            </strong>
            <br />
            <Link href="/admin/control" className="text-court-blue">
              {isKy ? "Көзөмөл" : "Контроль поручений"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Журнал, мөөнөттөр, жооптун жөнөтүлүшү."
                : "Журнал исполнения, сроки, направление ответа гражданину."}
            </span>
          </li>
          <li>
            <strong>
              {isKy ? "Мониторинг" : "Мониторинг"}
            </strong>
            <br />
            <Link href="/admin/analytics" className="text-court-blue">
              {isKy ? "Мониторинг" : "Мониторинг"}
            </Link>
            <br />
            <span className="text-xs text-slate-500">
              {isKy
                ? "Кайталанма кайрылуулар, темалар, баалоолор."
                : "Повторные обращения, темы, оценки качества."}
            </span>
          </li>
        </ol>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "4. Суроо-талап боюнча статус"
            : "4. Запрос гражданина о статусе"
        }
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            {isKy
              ? "Аныктоо: каттоо коду же телефон / ФИО."
              : "Идентификация: регистрационный код либо телефон / ФИО."}
          </li>
          <li>
            {isKy ? (
              <>
                Бөлүм{" "}
                <Link href="/admin/appeals" className="text-court-blue">
                  «Кайрылуулар»
                </Link>
                {" "}— издөө.
              </>
            ) : (
              <>
                Раздел{" "}
                <Link href="/admin/appeals" className="text-court-blue">
                  «Обращения»
                </Link>
                {" "}— поиск записи.
              </>
            )}
          </li>
          <li>
            {isKy
              ? "Маалымат берүү: учурдагы этап жана, зарыл болсо, дата/убакыт."
              : "Сообщение сведений: текущий этап и, при необходимости, дата и время приёма."}
          </li>
          <li>
            {isKy
              ? "Код же PIN жоголгондо: карточкадан маалымат берүү (негиздүү суроо-талап боюнча)."
              : "При утрате кода или PIN: сведения с карточки обращения (по обоснованному запросу)."}
          </li>
          <li>
            {isKy
              ? "Өз алдынча текшерүү: башкы бет → «Проверка состояния» → код."
              : "Самостоятельная проверка: главная страница → «Проверка состояния» → код."}
          </li>
        </ol>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "5. Жокко чыгаруу, которуу, неявка"
            : "5. Отмена, перенос, неявка"
        }
        defaultOpen={false}
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            {isKy
              ? "Кызматкер: карточка же календарь — «Отмена», «Неявка», «Вернуть»; датаны өзгөртүү — блок «Дата, время и статусы»."
              : "Сотрудник: карточка или календарь — «Отмена», «Неявка», «Вернуть»; изменение даты — блок «Дата, время и статусы»."}
          </li>
          <li>
            {isKy
              ? `Жаран: ${routes.appointmentStatus} — каттоо коду жана PIN-код.`
              : `Гражданин: ${routes.appointmentStatus} — регистрационный код и PIN-код.`}
          </li>
        </ul>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "6. Контент, допуск, график"
            : "6. Контент, допуск, график"
        }
        defaultOpen={false}
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <Link href="/admin/content" className="text-court-blue">
              {isKy ? "Контент сервиса" : "Контент сервиса"}
            </Link>
            {isKy
              ? " — ачык бөлүмдүн тексттери жана эрежелер."
              : " — тексты публичного раздела и правила записи."}
          </li>
          <li>
            <Link href="/admin/eligibility" className="text-court-blue">
              {isKy ? "Допуск дарагы" : "Дерево допуска"}
            </Link>
            {isKy
              ? " — жазылууга уруксат / баш тартуу категориялары."
              : " — категории допуска к записи и тексты отказа."}
          </li>
          <li>
            <Link href="/admin/settings" className="text-court-blue">
              {isKy ? "График приёма" : "График приёма"}
            </Link>
            {isKy
              ? " — күндөр, убакыт (24 саат), жабык күндөр."
              : " — дни приёма, время (24-часовой формат), закрытые даты."}
          </li>
        </ul>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "7. Модуль «Сурамжылоо»"
            : "7. Модуль «Опросник»"
        }
        defaultOpen={false}
      >
        <p className="text-sm text-slate-700">
          {isKy
            ? "Модуль «Сурамжылоо» — анкета суроолорун түзөтүү. Жарандардын анкета толтуруусу жана жыйынтыктар — opros.sot.kg. Негизги иш — модуль «Жарандарды кабыл алуу»."
            : "Модуль «Опросник» предназначен для редактирования формулировок вопросов анкеты. Заполнение анкеты гражданами и учёт результатов осуществляются в системе opros.sot.kg. Основная работа в настоящем кабинете — модуль «Приём граждан»."}
        </p>
      </Collapsible>

      <Collapsible
        title={
          isKy
            ? "8. Эсептер жана укуктар"
            : "8. Учётные записи и права доступа"
        }
      >
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            {isKy
              ? "Кирүү: /admin/login. Логин жана сырсөз кызматкерге берилет. Каттоо эсептерин сервер жүргүзөт."
              : "Вход: /admin/login. Логин и пароль выдаются сотруднику. Учётные записи ведёт сервер."}
          </p>

          <p className="font-medium text-slate-900">
            {isKy ? "Ролдор боюнча мүмкүнчүлүктөр" : "Полномочия по ролям"}
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>reception</strong>
              {isKy
                ? " — кайрылуулар, календарь, даярдоо, кабыл алуунун катышуусу, контент/допуск/графикти түзөтүү, мониторинг."
                : " — обращения, календарь, подготовка, участие в приёме, редактирование контента/допуска/графика, мониторинг."}
            </li>
            <li>
              <strong>leadership</strong>
              {isKy
                ? " — кабыл алууну фиксациялоо, протокол, мониторинг; контент жана график."
                : " — фиксация личного приёма, протокол, мониторинг; контент и график."}
            </li>
            <li>
              <strong>responsible</strong>
              {isKy
                ? " — көзөмөл: негизинен өзүнө берилген тапшырмалар, журнал, жооп."
                : " — контроль: преимущественно поручения, назначенные на данного сотрудника; журнал, ответ."}
            </li>
            <li>
              <strong>admin</strong>
              {isKy
                ? " — бардык бөлүмдөр; толук башкаруу."
                : " — все разделы; полное управление."}
            </li>
          </ul>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border border-slate-200 text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-2 py-2">
                    {isKy ? "Бөлүм / аракет" : "Раздел / действие"}
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center">
                    rec.
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center">
                    lead.
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center">
                    resp.
                  </th>
                  <th className="border-b border-slate-200 px-2 py-2 text-center">
                    admin
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {(
                  [
                    [
                      isKy ? "Иш тактасы, кайрылуулар, календарь" : "Рабочий стол, обращения, календарь",
                      "✓",
                      "✓",
                      "✓",
                      "✓",
                    ],
                    [
                      isKy ? "Даярдоо / жеке кабыл алуу" : "Подготовка / личный приём",
                      "✓",
                      "✓",
                      "—",
                      "✓",
                    ],
                    [
                      isKy ? "Тапшырмаларды көзөмөлдөө" : "Контроль поручений",
                      "✓",
                      "✓",
                      "✓*",
                      "✓",
                    ],
                    [
                      isKy ? "Мониторинг" : "Мониторинг",
                      "✓",
                      "✓",
                      "✓",
                      "✓",
                    ],
                    [
                      isKy ? "Контент, допуск, график" : "Контент, допуск, график",
                      "✓",
                      "✓",
                      "—",
                      "✓",
                    ],
                    [
                      isKy ? "Сурамжылоо (суроолор)" : "Опросник (вопросы)",
                      "✓",
                      "✓",
                      "✓",
                      "✓",
                    ],
                  ] as const
                ).map((row) => (
                  <tr key={row[0]}>
                    <td className="border-b border-slate-100 px-2 py-1.5">
                      {row[0]}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1.5 text-center">
                      {row[1]}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1.5 text-center">
                      {row[2]}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1.5 text-center">
                      {row[3]}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1.5 text-center">
                      {row[4]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            {isKy
              ? "* responsible — негизинен өзүнө дайындалган тапшырмалар."
              : "* responsible — преимущественно поручения, назначенные на сотрудника."}
          </p>
        </div>
      </Collapsible>

      <FaqSection isKy={isKy} defaultRole={faqDefaultRole} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="font-semibold text-slate-900">
          {isKy ? "Жыйынтык" : "Итог"}
        </div>
        <p className="mt-2 text-slate-600">
          {isKy
            ? "Жаран жазылат → даярдоо жана кабыл алуу → тапшырманы көзөмөлдөө → жооп → баалоо. Каттоо коду — статус; каттоо коду жана PIN — жазылууну башкаруу."
            : "Гражданин регистрирует запись → подготовка и личный приём → контроль поручения → ответ → оценка. Регистрационный код — статус; регистрационный код и PIN — управление записью."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin" className="btn-primary !text-sm">
            {isKy ? "Иш тактасы" : "Рабочий стол"}
          </Link>
          <Link href="/admin/appeals" className="btn-outline !text-sm">
            {isKy ? "Кайрылуулар" : "Обращения"}
          </Link>
          <Link href="/" className="btn-outline !text-sm" target="_blank">
            {isKy ? "Ачык бөлүм" : "Публичный раздел"}
          </Link>
        </div>
      </div>
    </div>
  );
}
