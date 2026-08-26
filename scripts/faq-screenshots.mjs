// Одноразовый скрипт: делает скриншоты для FAQ в /admin/help (public/faq/*.png).
// Данные — только внутри изолированного профиля Playwright (localStorage
// отдельного headless-браузера), реальные данные пользователя не трогаются.
//
// Запуск: node scripts/faq-screenshots.mjs
// Требует уже запущенный `npm run dev` на http://localhost:3000.

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "public", "faq");
const STORAGE_KEY = "vs-kr-citizen-platform-v13";

fs.mkdirSync(OUT_DIR, { recursive: true });

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function nextWeekday(target) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 3; i < 30; i++) {
    const c = new Date(d);
    c.setDate(d.getDate() + i);
    if (c.getDay() === target) return c;
  }
  return d;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysAgoDate(n) {
  return isoDate(new Date(Date.now() - n * 86400000));
}
function daysAhead(n) {
  return isoDate(new Date(Date.now() + n * 86400000));
}
function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000).toISOString();
}

const tue = nextWeekday(2);
const thu = nextWeekday(4);
const tueIso = isoDate(tue);
const thuIso = isoDate(thu);
const sampleAppointments = [
  {
    id: "apt-demo-1",
    code: "VS-2026-9001",
    fullName: "Иванов Марат Болотович",
    phone: "+996700123456",
    pin: "9001",
    topic: "Организация судопроизводства",
    region: "Чуйская область",
    locality: "г. Бишкек",
    street: "ул. Ахунбаева, 12",
    category: "organization",
    date: tueIso,
    slotStart: "08:00",
    slotEnd: "08:20",
    status: "pending_review",
    targetId: "chairman",
    companions: [],
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
    history: [{ at: hoursAgo(3), action: "Заявка подана", detail: "Электронная запись" }],
  },
  {
    id: "apt-demo-2",
    code: "VS-2026-9002",
    fullName: "Сыдыкова Гульнара Асановна",
    phone: "+996700223344",
    pin: "9002",
    topic: "Деятельность суда",
    region: "г. Бишкек",
    locality: "г. Бишкек",
    street: "ул. Чуй, 45",
    category: "court_activity",
    date: tueIso,
    slotStart: "09:00",
    slotEnd: "09:20",
    status: "confirmed",
    targetId: "chairman",
    companions: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    history: [
      { at: daysAgo(2), action: "Заявка подана" },
      { at: daysAgo(1), action: "Подтверждена", staffName: "Касымова Айгуль Бакытовна" },
    ],
  },
  {
    id: "apt-demo-3",
    code: "VS-2026-9003",
    fullName: "Осмонов Бакыт Талантович",
    phone: "+996555112233",
    pin: "9003",
    topic: "Внесение изменений в законодательство",
    region: "Ошская область",
    locality: "г. Ош",
    street: "ул. Ленина, 8",
    category: "legislation",
    date: thuIso,
    slotStart: "09:25",
    slotEnd: "09:45",
    status: "confirmed",
    targetId: "deputy_bakirova",
    companions: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    history: [
      { at: daysAgo(2), action: "Заявка подана" },
      { at: daysAgo(1), action: "Подтверждена", staffName: "Касымова Айгуль Бакытовна" },
    ],
  },
  {
    id: "apt-demo-4",
    code: "VS-2026-8991",
    fullName: "Керимова Айнура Садыровна",
    phone: "+996700998877",
    pin: "8991",
    topic: "Разъяснение порядка обращения",
    region: "г. Бишкек",
    locality: "г. Бишкек",
    street: "ул. Токтогула, 5",
    category: "organization",
    date: daysAgoDate(6),
    slotStart: "08:00",
    slotEnd: "08:20",
    status: "accepted",
    targetId: "chairman",
    companions: [],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
    history: [
      { at: daysAgo(7), action: "Заявка подана" },
      { at: daysAgo(6), action: "Принята на личном приёме", staffName: "Сатыев Медербек Асанбекович" },
    ],
  },
  {
    id: "apt-demo-5",
    code: "VS-2026-8980",
    fullName: "Тагаев Эмиль Асылбекович",
    phone: "+996777001122",
    pin: "8980",
    topic: "Организация приёма граждан",
    region: "Джалал-Абадская область",
    locality: "г. Джалал-Абад",
    street: "ул. Боконбаева, 3",
    category: "organization",
    date: daysAgoDate(14),
    slotStart: "08:25",
    slotEnd: "08:45",
    status: "accepted",
    targetId: "chairman",
    companions: [],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(10),
    history: [
      { at: daysAgo(15), action: "Заявка подана" },
      { at: daysAgo(14), action: "Принята на личном приёме", staffName: "Сатыев Медербек Асанбекович" },
    ],
  },
];

const sampleAppeals = [
  {
    id: "apl-demo-1",
    appointmentId: "apt-demo-1",
    code: "VS-2026-9001",
    fullName: "Иванов Марат Болотович",
    phone: "+996700123456",
    topic: "Организация судопроизводства",
    region: "Чуйская область",
    locality: "г. Бишкек",
    street: "ул. Ахунбаева, 12",
    category: "organization",
    summary: "Просит разъяснить порядок подачи обращения по организации судопроизводства.",
    stage: "registered",
    previousAppealIds: [],
    previousNotes: "",
    prepNotes: "",
    controlLog: [],
    notifications: [],
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
  },
  {
    id: "apl-demo-2",
    appointmentId: "apt-demo-2",
    code: "VS-2026-9002",
    fullName: "Сыдыкова Гульнара Асановна",
    phone: "+996700223344",
    topic: "Деятельность суда",
    region: "г. Бишкек",
    locality: "г. Бишкек",
    street: "ул. Чуй, 45",
    category: "court_activity",
    summary: "Просит разъяснить порядок обжалования процессуальных действий суда.",
    stage: "ready_for_reception",
    previousAppealIds: [],
    previousNotes: "",
    prepNotes: "Материалы проверены, тема относится к компетенции личного приёма.",
    prepCompletedBy: "Касымова Айгуль Бакытовна",
    prepCompletedAt: daysAgo(1),
    controlLog: [],
    notifications: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "apl-demo-3",
    appointmentId: "apt-demo-3",
    code: "VS-2026-9003",
    fullName: "Осмонов Бакыт Талантович",
    phone: "+996555112233",
    topic: "Внесение изменений в законодательство",
    region: "Ошская область",
    locality: "г. Ош",
    street: "ул. Ленина, 8",
    category: "legislation",
    summary: "Предложение по совершенствованию действующего законодательства КР.",
    stage: "ready_for_reception",
    previousAppealIds: [],
    previousNotes: "",
    prepNotes: "Материалы проверены.",
    prepCompletedBy: "Касымова Айгуль Бакытовна",
    prepCompletedAt: daysAgo(1),
    controlLog: [],
    notifications: [],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "apl-demo-4",
    appointmentId: "apt-demo-4",
    code: "VS-2026-8991",
    fullName: "Керимова Айнура Садыровна",
    phone: "+996700998877",
    topic: "Разъяснение порядка обращения",
    region: "г. Бишкек",
    locality: "г. Бишкек",
    street: "ул. Токтогула, 5",
    category: "organization",
    summary: "Просит разъяснить порядок подачи повторного обращения.",
    stage: "in_control",
    previousAppealIds: [],
    previousNotes: "",
    prepNotes: "",
    receptionProtocol: {
      heldAt: daysAgo(6),
      heldBy: "Сатыев Медербек Асанбекович",
      citizenStatement: "",
      leadershipExplanation: "Разъяснён порядок подачи обращения в соответствии с законодательством КР.",
      assignmentText: "Подготовить письменное разъяснение порядка обращения и направить заявителю.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      specialistsInvolved: "",
    },
    assignment: {
      text: "Подготовить письменное разъяснение порядка обращения и направить заявителю.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      dueDate: daysAhead(5),
      status: "assigned",
      createdAt: daysAgo(6),
    },
    controlLog: [
      {
        id: "log-1",
        at: daysAgo(6),
        authorId: "u-chair",
        authorName: "Сатыев Медербек Асанбекович",
        action: "Поручение выдано",
        comment: "Подготовить письменное разъяснение и направить заявителю.",
      },
    ],
    notifications: [],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
  {
    id: "apl-demo-5",
    appointmentId: "apt-demo-5",
    code: "VS-2026-8980",
    fullName: "Тагаев Эмиль Асылбекович",
    phone: "+996777001122",
    topic: "Организация приёма граждан",
    region: "Джалал-Абадская область",
    locality: "г. Джалал-Абад",
    street: "ул. Боконбаева, 3",
    category: "organization",
    summary: "Вопрос по организации личного приёма граждан в областном звене.",
    stage: "closed",
    previousAppealIds: [],
    previousNotes: "",
    prepNotes: "",
    assignment: {
      text: "Подготовить ответ по порядку организации приёма.",
      responsibleUserId: "u-deputy",
      responsibleName: "Бакирова Нургуль Жакыповна",
      dueDate: daysAgoDate(9),
      status: "done",
      createdAt: daysAgo(14),
    },
    controlLog: [
      {
        id: "log-2",
        at: daysAgo(9),
        authorId: "u-deputy",
        authorName: "Бакирова Нургуль Жакыповна",
        action: "Ответ направлен",
        comment: "Заявителю направлено письменное разъяснение.",
      },
    ],
    finalAnswer: "Заявителю направлено письменное разъяснение порядка организации приёма граждан.",
    finalAnswerAt: daysAgo(9),
    feedback: {
      respectful: 5,
      clearNextSteps: 5,
      convenient: 4,
      deadlinesMet: 5,
      comment: "Спасибо за оперативный ответ.",
      submittedAt: daysAgo(8),
    },
    notifications: [],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(8),
  },
];

// Реальный журнал в приложении пишет новые записи в начало массива
// (unshift) — сохраняем тот же порядок здесь, чтобы скрин совпадал с UI.
const sampleActionLog = [
  {
    id: "log-demo-4",
    at: daysAgo(1),
    userId: "u-admin",
    userName: "Администратор платформы",
    action: "Обновлены правила записи",
    entity: "content",
    detail: "Раздел «Правила»",
  },
  {
    id: "log-demo-3",
    at: daysAgo(9),
    userId: "u-deputy",
    userName: "Бакирова Нургуль Жакыповна",
    action: "Итоговый ответ направлен",
    entity: "assignment",
    entityId: "apl-demo-5",
    detail: "Обращение закрыто",
  },
  {
    id: "log-demo-2",
    at: daysAgo(6),
    userId: "u-chair",
    userName: "Сатыев Медербек Асанбекович",
    action: "Ответственный назначен",
    entity: "assignment",
    entityId: "apl-demo-4",
    detail: "Бакирова Н.Ж.",
  },
  {
    id: "log-demo-1",
    at: daysAgo(6),
    userId: "u-chair",
    userName: "Сатыев Медербек Асанбекович",
    action: "Приём проведён, поручение выдано",
    entity: "appointment",
    entityId: "apt-demo-4",
    detail: "VS-2026-8991",
  },
];

async function loginAs(page, login, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.locator("#login").fill(login);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function logout(page) {
  await page.getByRole("button", { name: /Выход/ }).click();
  await page.waitForURL(/\/admin\/login/, { timeout: 15000 });
}

async function shotMain(page, filename) {
  const main = page.locator("main.admin-page-enter");
  await main.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(250);
  await main.screenshot({ path: path.join(OUT_DIR, filename) });
  console.log("  saved", filename);
}

async function shotModal(page, filename) {
  const modal = page.locator('[role="dialog"]').first();
  await modal.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(250);
  await modal.screenshot({ path: path.join(OUT_DIR, filename) });
  console.log("  saved", filename);
}

async function closeModal(page) {
  await page.keyboard.press("Escape");
  await page.locator('[role="dialog"]').first().waitFor({ state: "hidden", timeout: 10000 });
  await page.waitForTimeout(150);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    locale: "ru-RU",
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.log("  [pageerror]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("  [console.error]", msg.text());
  });

  console.log("Загрузка приложения и посев тестовых данных (только в этом браузере)…");
  // По умолчанию интерфейс на кыргызском (vs-kr-lang) — переключаем на русский
  // до логина, чтобы все скрины были на русском.
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("vs-kr-lang", "ru"));
  await page.reload({ waitUntil: "networkidle" });

  // Zustand persist пишет в localStorage только после первого set() —
  // логинимся один раз, чтобы ключ появился, прежде чем его патчить.
  console.log("Роль: Справочная");
  await loginAs(page, "spravochnaya", "1111");

  const injected = await page.evaluate(
    ({ key, appts, appeals, log }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      parsed.state.appointments = [...(parsed.state.appointments || []), ...appts];
      parsed.state.appeals = [...(parsed.state.appeals || []), ...appeals];
      parsed.state.actionLog = [...(parsed.state.actionLog || []), ...log];
      localStorage.setItem(key, JSON.stringify(parsed));
      return true;
    },
    { key: STORAGE_KEY, appts: sampleAppointments, appeals: sampleAppeals, log: sampleActionLog }
  );
  if (!injected) {
    throw new Error(
      `Не найден ключ localStorage "${STORAGE_KEY}" — проверьте STORAGE_KEY в src/lib/store.ts`
    );
  }
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // ---------- Справочная (reception) ----------
  await page.goto(`${BASE}/admin/inbox`, { waitUntil: "networkidle" });
  await page.getByText("VS-2026-9001", { exact: true }).first().click();
  await shotModal(page, "rec-confirm.png");
  await closeModal(page);

  await page.getByText("VS-2026-9002", { exact: true }).first().click();
  await page.getByRole("button", { name: "Перенести запись" }).click();
  await page.waitForTimeout(400);
  await shotModal(page, "rec-reschedule.png");
  await closeModal(page);

  await page.goto(`${BASE}/admin/appeals`, { waitUntil: "networkidle" });
  await shotMain(page, "rec-pin.png");
  await page.locator("#q").fill("Сыдыкова");
  await page.waitForTimeout(200);
  await shotMain(page, "rec-search.png");
  await page.getByText("VS-2026-9002", { exact: true }).first().click();
  await page.waitForURL(/\/admin\/appeals\/apl-demo-2/, { timeout: 10000 });
  const quickActions = page.locator("section", { hasText: "Быстрые действия" }).first();
  await quickActions.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(250);
  await quickActions.screenshot({ path: path.join(OUT_DIR, "rec-noshow.png") });
  console.log("  saved rec-noshow.png");

  await logout(page);

  // ---------- Председатель (leadership) ----------
  console.log("Роль: Председатель");
  await loginAs(page, "predsedatel", "1111");

  await page.goto(`${BASE}/admin/reception`, { waitUntil: "networkidle" });
  await shotMain(page, "lead-queue.png");
  await page.getByText("VS-2026-9002", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea[placeholder^="Содержание поручения"]').fill(
    "Подготовить письменное разъяснение по деятельности суда и направить заявителю."
  );
  await page
    .locator('[role="dialog"] select')
    .selectOption({ label: "Бакирова Нургуль Жакыповна — Заместитель Председателя Верховного суда КР" })
    .catch(() => {});
  await shotModal(page, "lead-protocol.png");
  await closeModal(page);

  await page.goto(`${BASE}/admin/appeals`, { waitUntil: "networkidle" });
  await page.locator("#q").fill("VS-2026-9003");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Поручить" }).first().click();
  await page.waitForTimeout(300);
  await shotModal(page, "lead-assign-later.png");
  await closeModal(page);

  await logout(page);

  // ---------- Исполнитель / Зампред (responsible) ----------
  console.log("Роль: Исполнитель");
  await loginAs(page, "ispolnitel", "1111");

  await page.goto(`${BASE}/admin/reception`, { waitUntil: "networkidle" });
  await shotMain(page, "resp-deputy-queue.png");

  await page.goto(`${BASE}/admin/control`, { waitUntil: "networkidle" });
  await shotMain(page, "resp-list.png");
  await page.getByText("VS-2026-8991", { exact: true }).first().click();
  await page.waitForTimeout(300);
  await shotModal(page, "resp-status.png");
  const answerBox = page.locator('[role="dialog"] textarea').last();
  await answerBox.fill(
    "Заявителю направлено письменное разъяснение порядка подачи обращения в соответствии с законодательством КР."
  );
  await shotModal(page, "resp-answer.png");
  await closeModal(page);

  await logout(page);

  // ---------- Администратор ----------
  console.log("Роль: Администратор");
  await loginAs(page, "admin", "1111");

  await page.goto(`${BASE}/admin/content`, { waitUntil: "networkidle" });
  await shotMain(page, "admin-content.png");

  await page.goto(`${BASE}/admin/eligibility`, { waitUntil: "networkidle" });
  await shotMain(page, "admin-eligibility.png");

  await page.goto(`${BASE}/admin/settings`, { waitUntil: "networkidle" });
  await shotMain(page, "admin-schedule.png");

  await page.goto(`${BASE}/admin/journal`, { waitUntil: "networkidle" });
  await shotMain(page, "admin-journal.png");

  await page.goto(`${BASE}/admin/analytics`, { waitUntil: "networkidle" });
  await shotMain(page, "admin-analytics.png");

  await browser.close();
  console.log("Готово. Скриншоты сохранены в public/faq/.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
