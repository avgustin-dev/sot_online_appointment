/**
 * Учебные заявки и карточки для локального контура / презентации.
 * Включаются, пока NEXT_PUBLIC_DEMO !== "false" и API не подключён.
 * 20 записей покрывают все статусы записи и этапы карточки.
 */
import { addDays, format, nextThursday, nextTuesday, previousThursday } from "date-fns";
import type {
  AppealCard,
  Appointment,
  AppointmentStatus,
  AppealStage,
  AssignmentStatus,
} from "./types";

type DemoRow = {
  n: number;
  fullName: string;
  phone: string;
  email?: string;
  topic: string;
  category: Appointment["category"];
  region: string;
  locality: string;
  street: string;
  targetId: string;
  status: AppointmentStatus;
  stage: AppealStage;
  /** Относительная дата: "today" | "nextTue" | "nextThu" | "prevThu" | offset days from today */
  when: "today" | "nextTue" | "nextThu" | "prevThu" | number;
  slotStart: string;
  slotEnd: string;
  description?: string;
  companions?: { fullName: string; phone?: string }[];
  prepNotes?: string;
  assignment?: {
    text: string;
    responsibleUserId: string;
    responsibleName: string;
    status: AssignmentStatus;
    dueOffsetDays?: number;
  };
  protocol?: {
    leadershipExplanation: string;
    assignmentText: string;
    specialistsInvolved: string;
  };
  finalAnswer?: string;
  feedback?: {
    respectful: number;
    clearNextSteps: number;
    convenient: number;
    deadlinesMet: number;
    comment?: string;
  };
  reviewNote?: string;
};

const ROWS: DemoRow[] = [
  // 1–3 — поступившие (приёмная подтверждает/отклоняет)
  {
    n: 1,
    fullName: "Асанова Гульмира Токтосуновна",
    phone: "+996 700 111 001",
    email: "asanova@example.kg",
    topic: "Сроки рассмотрения обращений граждан",
    category: "organization",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Чуй, 120",
    targetId: "reception",
    status: "pending_review",
    stage: "registered",
    when: "today",
    slotStart: "08:00",
    slotEnd: "08:20",
    description: "Прошу разъяснить порядок и сроки ответа на письменные обращения.",
  },
  {
    n: 2,
    fullName: "Жумабеков Эрлан Сагынович",
    phone: "+996 700 111 002",
    topic: "График работы общественной приёмной",
    category: "organization",
    region: "Чуйская область",
    locality: "г. Токмок",
    street: "ул. Ленина, 15",
    targetId: "reception",
    status: "pending_review",
    stage: "registered",
    when: "today",
    slotStart: "08:25",
    slotEnd: "08:45",
    description: "Нужна информация о днях и часах приёма граждан в общественной приёмной.",
    companions: [{ fullName: "Жумабекова Айнура", phone: "+996 700 111 012" }],
  },
  {
    n: 3,
    fullName: "Омурзакова Нуржан Бекболотовна",
    phone: "+996 700 111 003",
    email: "omurzakova@mail.kg",
    topic: "Доступность приёма для лиц с ограниченными возможностями",
    category: "organization",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "мкр. Асанбай, 12",
    targetId: "reception",
    status: "pending_review",
    stage: "registered",
    when: "today",
    slotStart: "08:50",
    slotEnd: "09:10",
    description: "Вопрос об организации доступной среды при личном приёме.",
  },
  // 4–5 — подтверждены, подготовка ещё не начата
  {
    n: 4,
    fullName: "Исаев Бакыт Каримович",
    phone: "+996 700 111 004",
    topic: "Информирование о работе судов",
    category: "organization",
    region: "Ошская область",
    locality: "г. Ош",
    street: "ул. Курманжан Датка, 45",
    targetId: "reception",
    status: "confirmed",
    stage: "registered",
    when: "today",
    slotStart: "09:15",
    slotEnd: "09:35",
    description: "Прошу разъяснить, где публикуются графики приёма в судах области.",
  },
  {
    n: 5,
    fullName: "Сыдыкова Айгерим Маратовна",
    phone: "+996 700 111 005",
    topic: "Качество работы общественной приёмной",
    category: "court_activity",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Ибраимова, 88",
    targetId: "reception",
    status: "confirmed",
    stage: "registered",
    when: "today",
    slotStart: "09:40",
    slotEnd: "10:00",
    description: "Обращение по организации работы аппарата при приёме граждан.",
  },
  // 6–7 — на изучении (prep)
  {
    n: 6,
    fullName: "Мамытов Данияр Асылбекович",
    phone: "+996 700 111 006",
    topic: "Поведение сотрудников аппарата",
    category: "court_activity",
    region: "Иссык-Кульская область",
    locality: "г. Каракол",
    street: "ул. Абдрахманова, 3",
    targetId: "reception",
    status: "confirmed",
    stage: "under_review",
    when: "today",
    slotStart: "10:05",
    slotEnd: "10:25",
    description: "Жалоба на обращение сотрудников аппарата (не судей) с гражданами.",
    prepNotes: "Запрошены служебные записки. Готовится справка для руководства.",
  },
  {
    n: 7,
    fullName: "Бекова Чынара Орозбековна",
    phone: "+996 700 111 007",
    email: "bekova@example.kg",
    topic: "Работа официального сайта суда",
    category: "court_activity",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "пр. Манаса, 57",
    targetId: "reception",
    status: "confirmed",
    stage: "under_review",
    when: "today",
    slotStart: "10:30",
    slotEnd: "10:50",
    description: "Предложения по улучшению раздела «Приём граждан» на сайте.",
    prepNotes: "Согласовано с ИТ-службой. Материалы готовы на 80%.",
  },
  // 8–9 — готовы к приёму (протокол)
  {
    n: 8,
    fullName: "Каримов Азамат Нурланович",
    phone: "+996 700 111 008",
    topic: "Предложения по организации судебной системы",
    category: "legislation",
    region: "Джалал-Абадская область",
    locality: "г. Джалал-Абад",
    street: "ул. Эркиндик, 21",
    targetId: "chairman",
    status: "confirmed",
    stage: "ready_for_reception",
    when: "today",
    slotStart: "09:00",
    slotEnd: "09:20",
    description: "Предложения по совершенствованию организации судебной системы КР.",
    prepNotes: "Справка подготовлена. Рекомендуется принять.",
  },
  {
    n: 9,
    fullName: "Турдубаева Мээрим Жаныбековна",
    phone: "+996 700 111 009",
    topic: "Процессуальное законодательство — предложения",
    category: "legislation",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Киевская, 150",
    targetId: "deputy_bakirova",
    status: "confirmed",
    stage: "ready_for_reception",
    when: "today",
    slotStart: "15:00",
    slotEnd: "15:20",
    description: "Предложения по совершенствованию процессуального законодательства.",
    prepNotes: "Карточка готова к личному приёму заместителя Председателя.",
  },
  // 10–11 — на контроле (поручения исполнителю)
  {
    n: 10,
    fullName: "Алымкулов Нурлан Токтогулович",
    phone: "+996 700 111 010",
    topic: "Организация информирования граждан",
    category: "organization",
    region: "Нарынская область",
    locality: "г. Нарын",
    street: "ул. Ленина, 7",
    targetId: "chairman",
    status: "accepted",
    stage: "in_control",
    when: "prevThu",
    slotStart: "09:25",
    slotEnd: "09:45",
    description: "По итогам приёма — поручение по информированию граждан.",
    prepNotes: "Подготовка завершена до приёма.",
    protocol: {
      leadershipExplanation: "Разъяснён порядок информирования. Дано поручение.",
      assignmentText: "Подготовить памятку для граждан и разместить на сайте в срок 14 дней.",
      specialistsInvolved: "Отдел по работе с гражданами",
    },
    assignment: {
      text: "Подготовить памятку для граждан и разместить на сайте в срок 14 дней.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      status: "assigned",
      dueOffsetDays: 10,
    },
  },
  {
    n: 11,
    fullName: "Сарыбаева Эльвира Кубанычбековна",
    phone: "+996 700 111 011",
    email: "sarybaeva@example.kg",
    topic: "Организация приёма в региональных судах",
    category: "organization",
    region: "Таласская область",
    locality: "г. Талас",
    street: "ул. Бердике баатыра, 9",
    targetId: "deputy_bakirova",
    status: "accepted",
    stage: "in_control",
    when: "prevThu",
    slotStart: "15:25",
    slotEnd: "15:45",
    description: "Поручение по обобщению практики организации приёма в регионах.",
    protocol: {
      leadershipExplanation: "Вопрос принят к рассмотрению.",
      assignmentText: "Собрать сведения по областным судам и представить сводку.",
      specialistsInvolved: "Аппарат ВС КР",
    },
    assignment: {
      text: "Собрать сведения по областным судам и представить сводку.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      status: "in_progress",
      dueOffsetDays: 7,
    },
  },
  // 12 — ответ направлен
  {
    n: 12,
    fullName: "Кожомкулов Талант Белекович",
    phone: "+996 700 111 012",
    topic: "Иной организационный вопрос приёмной",
    category: "other",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Московская, 172",
    targetId: "reception",
    status: "completed",
    stage: "answered",
    when: -14,
    slotStart: "08:00",
    slotEnd: "08:20",
    description: "Организационный вопрос в рамках компетенции общественной приёмной.",
    protocol: {
      leadershipExplanation: "Разъяснения даны на приёме.",
      assignmentText: "Направить письменный ответ заявителю.",
      specialistsInvolved: "Приёмная",
    },
    assignment: {
      text: "Направить письменный ответ заявителю.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      status: "done",
      dueOffsetDays: -2,
    },
    finalAnswer:
      "По итогам рассмотрения направлены разъяснения о порядке записи и приёма. Обращение снято с контроля.",
  },
  // 13 — закрыто с оценкой
  {
    n: 13,
    fullName: "Нурматова Динара Асанбековна",
    phone: "+996 700 111 013",
    email: "nurmatova@example.kg",
    topic: "Качество организации работы аппарата",
    category: "court_activity",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Рыскулова, 34",
    targetId: "reception",
    status: "completed",
    stage: "closed",
    when: -21,
    slotStart: "08:25",
    slotEnd: "08:45",
    description: "Обращение по качеству организации работы общественной приёмной.",
    protocol: {
      leadershipExplanation: "Приняты к сведению. Поручено усилить контроль.",
      assignmentText: "Провести внутреннюю проверку и отчитаться.",
      specialistsInvolved: "Общественная приёмная",
    },
    assignment: {
      text: "Провести внутреннюю проверку и отчитаться.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      status: "done",
      dueOffsetDays: -10,
    },
    finalAnswer: "Проверка проведена. Заявителю направлен ответ. Карточка закрыта.",
    feedback: {
      respectful: 5,
      clearNextSteps: 5,
      convenient: 4,
      deadlinesMet: 5,
      comment: "Ответ получен вовремя, спасибо.",
    },
  },
  // 14 — отклонена
  {
    n: 14,
    fullName: "Петров Иван Сергеевич",
    phone: "+996 700 111 014",
    topic: "Вопрос вне компетенции приёма",
    category: "other",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Токтогула, 99",
    targetId: "reception",
    status: "rejected",
    stage: "cancelled",
    when: "nextTue",
    slotStart: "10:55",
    slotEnd: "11:15",
    description: "Заявка отклонена: предмет не относится к компетенции личного приёма.",
    reviewNote: "Предмет обращения не соответствует правилам личного приёма.",
  },
  // 15 — отменена
  {
    n: 15,
    fullName: "Абдыкадырова Жылдыз Медербековна",
    phone: "+996 700 111 015",
    topic: "Отмена по просьбе заявителя",
    category: "organization",
    region: "Баткенская область",
    locality: "г. Баткен",
    street: "ул. Раззакова, 5",
    targetId: "reception",
    status: "cancelled",
    stage: "cancelled",
    when: "nextThu",
    slotStart: "11:20",
    slotEnd: "11:40",
    description: "Заявитель отменил запись самостоятельно.",
  },
  // 16 — неявка
  {
    n: 16,
    fullName: "Солтобаев Руслан Эрмекович",
    phone: "+996 700 111 016",
    topic: "Неявка без уведомления",
    category: "organization",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Боконбаева, 210",
    targetId: "reception",
    status: "no_show",
    stage: "cancelled",
    when: -7,
    slotStart: "09:15",
    slotEnd: "09:35",
    description: "Гражданин не явился на подтверждённый приём.",
  },
  // 17 — перенесена
  {
    n: 17,
    fullName: "Кыдырбаева Айзада Талантбековна",
    phone: "+996 700 111 017",
    email: "kydyrbaeva@example.kg",
    topic: "Перенос записи по инициативе приёмной",
    category: "organization",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Шопокова, 40",
    targetId: "reception",
    status: "rescheduled",
    stage: "registered",
    when: "nextTue",
    slotStart: "11:20",
    slotEnd: "11:40",
    description: "Запись перенесена на ближайший свободный слот.",
  },
  // 18 — к председателю, подтверждена, на изучении
  {
    n: 18,
    fullName: "Усенов Медербек Жолдошевич",
    phone: "+996 700 111 018",
    topic: "Предложения по законодательству в сфере правосудия",
    category: "legislation",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Тыныстанова, 197",
    targetId: "chairman",
    status: "confirmed",
    stage: "under_review",
    when: "nextThu",
    slotStart: "09:50",
    slotEnd: "10:10",
    description: "Иные предложения по законодательству в сфере правосудия.",
    prepNotes: "Готовится аналитическая справка для Председателя.",
  },
  // 19 — к зам. Бакировой, подтверждена
  {
    n: 19,
    fullName: "Жакшылыкова Бермет Асылбековна",
    phone: "+996 700 111 019",
    topic: "Организация приёма у заместителя Председателя",
    category: "organization",
    region: "Чуйская область",
    locality: "с. Ленинское",
    street: "ул. Центральная, 2",
    targetId: "deputy_bakirova",
    status: "confirmed",
    stage: "registered",
    when: "nextThu",
    slotStart: "15:25",
    slotEnd: "15:45",
    description: "Вопрос организации личного приёма у заместителя Председателя.",
  },
  // 20 — повторное обращение того же гражданина, что №1 (для истории)
  {
    n: 20,
    fullName: "Асанова Гульмира Токтосуновна",
    phone: "+996 700 111 001",
    email: "asanova@example.kg",
    topic: "Повторное обращение: сроки ответов",
    category: "organization",
    region: "г. Бишкек",
    locality: "Бишкек",
    street: "ул. Чуй, 120",
    targetId: "reception",
    status: "completed",
    stage: "closed",
    when: -30,
    slotStart: "10:05",
    slotEnd: "10:25",
    description: "Ранее рассматривался аналогичный вопрос — повторное обращение.",
    protocol: {
      leadershipExplanation: "Повторно разъяснён порядок.",
      assignmentText: "Направить повторный ответ со ссылкой на предыдущий.",
      specialistsInvolved: "Приёмная",
    },
    assignment: {
      text: "Направить повторный ответ со ссылкой на предыдущий.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      status: "done",
      dueOffsetDays: -20,
    },
    finalAnswer: "Повторный ответ направлен. Карточка закрыта.",
    feedback: {
      respectful: 4,
      clearNextSteps: 4,
      convenient: 5,
      deadlinesMet: 4,
      comment: "Ответ понятен.",
    },
  },
];

function resolveDate(when: DemoRow["when"], from = new Date()): string {
  let d: Date;
  if (when === "today") d = from;
  else if (when === "nextTue") d = nextTuesday(from);
  else if (when === "nextThu") d = nextThursday(from);
  else if (when === "prevThu") d = previousThursday(from);
  else d = addDays(from, when);
  return format(d, "yyyy-MM-dd");
}

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

/**
 * Строит 20 учебных заявок и карточек.
 * PIN у всех одинаковый для удобства показа: 1234 (кроме отклонённых — тоже 1234).
 */
export function buildDemoDataset(from = new Date()): {
  appointments: Appointment[];
  appeals: AppealCard[];
} {
  const year = from.getFullYear();
  const now = from.toISOString();
  const appointments: Appointment[] = [];
  const appeals: AppealCard[] = [];

  for (const row of ROWS) {
    const code = `VS-${year}-${pad(row.n)}`;
    const pin = "1234";
    const aptId = `apt-demo-${row.n}`;
    const aplId = `apl-demo-${row.n}`;
    const date = resolveDate(row.when, from);
    const createdAt = addDays(from, -Math.max(1, row.n)).toISOString();

    const history: Appointment["history"] = [
      { at: createdAt, action: "Поступила", detail: "Учебная запись", staffName: "Система" },
    ];
    if (row.status !== "pending_review") {
      history.push({
        at: createdAt,
        action:
          row.status === "rejected"
            ? "Не подтверждена"
            : row.status === "cancelled"
              ? "Отменена"
              : row.status === "no_show"
                ? "Неявка"
                : row.status === "rescheduled"
                  ? "Перенесена"
                  : row.status === "accepted" || row.status === "completed"
                    ? "Принята"
                    : "Подтверждена",
        staffName: "Касымова Айгуль Бакытовна",
        detail: row.reviewNote,
      });
    }
    // Завершение цикла (ответ гражданину) — отдельная запись в истории,
    // как её добавляет реальный submitFinalAnswer, а не часть «Принята».
    if (row.status === "completed" && row.finalAnswer) {
      history.push({
        at: createdAt,
        action: "Завершена",
        staffName:
          row.assignment?.responsibleName || "Бакирова Нургуль Жакыповна",
      });
    }

    const apt: Appointment = {
      id: aptId,
      code,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      pin,
      topic: row.topic,
      category: row.category,
      description: row.description,
      region: row.region,
      locality: row.locality,
      street: row.street,
      date,
      slotStart: row.slotStart,
      slotEnd: row.slotEnd,
      status: row.status,
      targetId: row.targetId,
      companions: row.companions ?? [],
      reviewNote: row.reviewNote,
      previousDate: row.status === "rescheduled" ? resolveDate(-7, from) : undefined,
      previousSlotStart: row.status === "rescheduled" ? "08:00" : undefined,
      previousSlotEnd: row.status === "rescheduled" ? "08:20" : undefined,
      createdAt,
      updatedAt: now,
      history,
    };

    const notifications: AppealCard["notifications"] = [
      {
        id: `n-demo-${row.n}-1`,
        at: createdAt,
        channel: "system",
        title: "Заявка поступила",
        body: "Запись вступит в силу после подтверждения приёмной.",
        read: true,
      },
    ];

    let assignment: AppealCard["assignment"];
    if (row.assignment) {
      const due = format(
        addDays(from, row.assignment.dueOffsetDays ?? 14),
        "yyyy-MM-dd"
      );
      assignment = {
        text: row.assignment.text,
        responsibleUserId: row.assignment.responsibleUserId,
        responsibleName: row.assignment.responsibleName,
        dueDate: due,
        status: row.assignment.status,
        createdAt,
      };
    }

    let receptionProtocol: AppealCard["receptionProtocol"];
    if (row.protocol) {
      receptionProtocol = {
        heldAt: createdAt,
        heldBy: "Сатыев Медербек Асанбекович",
        citizenStatement: row.description || row.topic,
        leadershipExplanation: row.protocol.leadershipExplanation,
        assignmentText: row.protocol.assignmentText,
        responsibleUserId: row.assignment?.responsibleUserId || "u-deputy",
        responsibleName:
          row.assignment?.responsibleName || "Бакирова Нургуль Жакыповна",
        specialistsInvolved: row.protocol.specialistsInvolved,
      };
    }

    const apl: AppealCard = {
      id: aplId,
      appointmentId: aptId,
      code,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      topic: row.topic,
      category: row.category,
      region: row.region,
      locality: row.locality,
      street: row.street,
      summary: row.description || row.topic,
      stage: row.stage,
      previousAppealIds: row.n === 1 ? ["apl-demo-20"] : [],
      previousNotes: row.n === 1 ? "Есть закрытое обращение VS-…-0020." : "",
      prepNotes: row.prepNotes || "",
      prepCompletedBy:
        row.stage === "ready_for_reception" ||
        ["in_control", "answered", "closed"].includes(row.stage)
          ? "Касымова Айгуль Бакытовна"
          : undefined,
      prepCompletedAt:
        row.stage === "ready_for_reception" ||
        ["in_control", "answered", "closed"].includes(row.stage)
          ? createdAt
          : undefined,
      receptionProtocol,
      assignment,
      controlLog: assignment
        ? [
            {
              id: `cl-demo-${row.n}`,
              at: createdAt,
              authorId: "u-deputy",
              authorName: "Бакирова Нургуль Жакыповна",
              action: "Поручение получено",
              comment: assignment.text,
            },
          ]
        : [],
      finalAnswer: row.finalAnswer,
      finalAnswerAt: row.finalAnswer ? createdAt : undefined,
      feedback: row.feedback
        ? {
            respectful: row.feedback.respectful,
            clearNextSteps: row.feedback.clearNextSteps,
            convenient: row.feedback.convenient,
            deadlinesMet: row.feedback.deadlinesMet,
            comment: row.feedback.comment,
            submittedAt: createdAt,
          }
        : undefined,
      notifications,
      createdAt,
      updatedAt: now,
    };

    appointments.push(apt);
    appeals.push(apl);
  }

  return { appointments, appeals };
}

/** PIN всех учебных записей — для проверки статуса гражданином. */
export const DEMO_PIN = "1234";

/** Краткая шпаргалка кодов для презентации. */
export function demoCodesCheatSheet(year = new Date().getFullYear()): string[] {
  return ROWS.map((r) => {
    const code = `VS-${year}-${pad(r.n)}`;
    return `${code}  PIN ${DEMO_PIN}  · ${r.status}/${r.stage}  · ${r.fullName}`;
  });
}
