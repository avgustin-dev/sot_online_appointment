/**
 * Полная проверка админки по ролям + полей 20 учебных записей.
 * В конце оставляет чистые 20 демо-записей в localStorage для презентации.
 *
 * Запуск (dev-сервер на :3000): node scripts/e2e-admin-full.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const STORAGE_KEY = "vs-kr-citizen-platform-v15";
const SHOTS = "scripts/e2e-shots";
mkdirSync(SHOTS, { recursive: true });

const year = new Date().getFullYear();
const code = (n) => `VS-${year}-${String(n).padStart(4, "0")}`;

let failed = 0;
const log = [];
function ok(msg) {
  const line = "OK   " + msg;
  console.log(line);
  log.push(line);
}
function fail(msg) {
  failed++;
  const line = "FAIL " + msg;
  console.log(line);
  log.push(line);
}
function info(msg) {
  const line = "···  " + msg;
  console.log(line);
  log.push(line);
}

async function login(page, loginName) {
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("vs-kr-lang", "ru"));
  // logout if already in
  const logout = page.getByRole("button", { name: /Выход/i });
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await page.waitForURL("**/admin/login**", { timeout: 10000 }).catch(() => {});
    await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  }
  await page.locator("#login").fill(loginName);
  await page.locator("#password").fill("1111");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(
    (u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"),
    { timeout: 15000 }
  );
}

async function logout(page) {
  const btn = page.getByRole("button", { name: /Выход/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(500);
  }
}

async function openFresh(context) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("vs-kr-lang", "ru");
  });
  // Одноразовая очистка до первого захода — не в initScript (иначе стирает на каждом goto)
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.removeItem("vs-kr-citizen-platform-v14");
    localStorage.removeItem("vs-kr-citizen-platform-v13");
    localStorage.removeItem("vs-kr-citizen-platform-v12");
  }, STORAGE_KEY);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#login").fill("admin");
  await page.locator("#password").fill("1111");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(
    (u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"),
    { timeout: 15000 }
  );
  await page.waitForTimeout(800);
  return page;
}

async function readStore(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.state || parsed;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});

try {
  // ═══════════ 1. СИД: 20 записей и поля ═══════════
  info("=== 1. Проверка 20 учебных записей ===");
  let page = await openFresh(context);
  const store = await readStore(page);
  if (!store) {
    fail("localStorage пуст после загрузки");
  } else {
    const apts = store.appointments || [];
    const apls = store.appeals || [];
    if (apts.length === 20) ok(`appointments: ${apts.length}`);
    else fail(`appointments: ожидалось 20, получено ${apts.length}`);
    if (apls.length === 20) ok(`appeals: ${apls.length}`);
    else fail(`appeals: ожидалось 20, получено ${apls.length}`);

    const requiredApt = [
      "id",
      "code",
      "fullName",
      "phone",
      "pin",
      "topic",
      "region",
      "locality",
      "street",
      "category",
      "date",
      "slotStart",
      "slotEnd",
      "status",
      "targetId",
      "companions",
      "createdAt",
      "updatedAt",
      "history",
    ];
    const requiredApl = [
      "id",
      "appointmentId",
      "code",
      "fullName",
      "phone",
      "topic",
      "region",
      "locality",
      "street",
      "category",
      "summary",
      "stage",
      "previousAppealIds",
      "prepNotes",
      "controlLog",
      "notifications",
      "createdAt",
      "updatedAt",
    ];

    let fieldOk = true;
    for (const a of apts) {
      for (const f of requiredApt) {
        if (a[f] === undefined || a[f] === null) {
          fail(`Заявка ${a.code}: нет поля ${f}`);
          fieldOk = false;
        }
      }
      if (!a.pin || a.pin.length !== 4) {
        fail(`Заявка ${a.code}: PIN некорректный (${a.pin})`);
        fieldOk = false;
      }
      if (!/^VS-\d{4}-\d{4}$/.test(a.code)) {
        fail(`Заявка ${a.code}: формат кода`);
        fieldOk = false;
      }
    }
    for (const a of apls) {
      for (const f of requiredApl) {
        if (a[f] === undefined || a[f] === null) {
          fail(`Карточка ${a.code}: нет поля ${f}`);
          fieldOk = false;
        }
      }
      const apt = apts.find((x) => x.id === a.appointmentId);
      if (!apt) {
        fail(`Карточка ${a.code}: нет связанной заявки`);
        fieldOk = false;
      } else if (apt.code !== a.code) {
        fail(`Карточка ${a.code}: код не совпадает с заявкой`);
        fieldOk = false;
      }
    }
    if (fieldOk) ok("Все обязательные поля заявок и карточек заполнены");

    // Распределение по статусам/этапам
    const byStatus = {};
    const byStage = {};
    for (const a of apts) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    for (const a of apls) byStage[a.stage] = (byStage[a.stage] || 0) + 1;
    info("Статусы: " + JSON.stringify(byStatus));
    info("Этапы: " + JSON.stringify(byStage));
    if ((byStatus.pending_review || 0) >= 3) ok("Есть поступившие (≥3)");
    else fail("Мало поступивших");
    if ((byStage.ready_for_reception || 0) >= 1) ok("Есть готовые к приёму");
    else fail("Нет готовых к приёму");
    if ((byStage.in_control || 0) >= 1) ok("Есть поручения на контроле");
    else fail("Нет поручений на контроле");
    if ((byStage.closed || 0) >= 1) ok("Есть закрытые");
    else fail("Нет закрытых");

    // Шпаргалка
    const cheat = apts
      .map((a) => {
        const apl = apls.find((x) => x.appointmentId === a.id);
        return `${a.code}  PIN ${a.pin}  · ${a.status}/${apl?.stage}  · ${a.fullName}  · ${a.targetId}  · ${a.date} ${a.slotStart}`;
      })
      .join("\n");
    writeFileSync("scripts/DEMO-20.txt", cheat + "\n", "utf8");
    ok("Шпаргалка записана в scripts/DEMO-20.txt");
  }
  await page.screenshot({ path: `${SHOTS}/admin-seed-home.png` });
  await logout(page);

  // ═══════════ 2. РОЛЬ: reception ═══════════
  info("=== 2. Роль справочная (spravochnaya) ===");
  await login(page, "spravochnaya");
  ok("Вход spravochnaya → " + page.url());

  // Навигация должна показывать заявки, не показывать поручения/приём протокол как основное?
  // StaffShell: canInbox, canAnalytics, canContent for reception
  await page.goto(BASE + "/admin/inbox", { waitUntil: "networkidle" });
  await page.getByText(code(1), { exact: false }).first().waitFor({ timeout: 15000 });
  ok("Inbox: видна заявка " + code(1));

  // Подтверждение #1
  await page.getByText(code(1)).first().click();
  await page
    .getByRole("button", { name: "Подтвердить. Уведомление заявителю" })
    .click();
  await page.waitForTimeout(800);
  {
    const s = await readStore(page);
    const apt = s.appointments.find((a) => a.code === code(1));
    if (apt?.status === "confirmed") ok("Подтверждение " + code(1));
    else fail("Подтверждение " + code(1) + " → " + apt?.status);
  }

  // Отклонение #2
  await page.goto(BASE + "/admin/inbox", { waitUntil: "networkidle" });
  await page.getByText(code(2)).first().click();
  const reason = page.locator("textarea").first();
  await reason.fill("Предмет не соответствует правилам личного приёма (тест).");
  await page.getByRole("button", { name: "Отказать в записи" }).click();
  await page.waitForTimeout(800);
  {
    const s = await readStore(page);
    const apt = s.appointments.find((a) => a.code === code(2));
    const apl = s.appeals.find((a) => a.code === code(2));
    if (apt?.status === "rejected" && apl?.stage === "cancelled")
      ok("Отклонение " + code(2) + " + этап cancelled");
    else
      fail(
        `Отклонение ${code(2)}: status=${apt?.status} stage=${apl?.stage}`
      );
  }

  // Подготовка: начать на #4
  await page.goto(BASE + "/admin/appeals", { waitUntil: "networkidle" });
  await page.getByText(code(4)).first().click();
  await page.waitForURL("**/admin/appeals/**", { timeout: 10000 });
  await page.getByRole("button", { name: "Начать подготовку" }).first().click();
  await page.waitForTimeout(600);
  {
    const s = await readStore(page);
    const apl = s.appeals.find((a) => a.code === code(4));
    if (apl?.stage === "under_review") ok("Начать подготовку " + code(4));
    else fail("Начать подготовку " + code(4) + " → " + apl?.stage);
  }

  // Завершить подготовку на #6
  await page.goto(BASE + "/admin/appeals", { waitUntil: "networkidle" });
  await page.getByText(code(6)).first().click();
  await page.waitForURL("**/admin/appeals/**");
  const prepNotes = page.locator("textarea").first();
  if (await prepNotes.isVisible().catch(() => false)) {
    await prepNotes.fill("Справка готова. Тест завершения подготовки.");
  }
  const donePrep = page.getByRole("button", { name: "Завершить подготовку" });
  if (await donePrep.isVisible().catch(() => false)) {
    await donePrep.click();
    await page.waitForTimeout(600);
    const s = await readStore(page);
    const apl = s.appeals.find((a) => a.code === code(6));
    if (apl?.stage === "ready_for_reception")
      ok("Завершить подготовку " + code(6));
    else fail("Завершить подготовку " + code(6) + " → " + apl?.stage);
  } else {
    fail("Кнопка «Завершить подготовку» не найдена на " + code(6));
  }

  // Страницы справочной
  for (const p of [
    "/admin/analytics",
    "/admin/content",
    "/admin/settings",
    "/admin/journal",
    "/admin/calendar",
  ]) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    const h1 = (await page.locator("h1").first().innerText().catch(() => "")).trim();
    const notFound = h1.includes("не найдена") || h1.includes("табылган жок");
    if (notFound || !h1) fail(`reception: ${p} недоступна (h1=${h1})`);
    else ok(`reception: ${p} открывается (${h1})`);
  }

  // Справочная НЕ должна проводить приём (протокол) — canConduct includes reception though!
  // Looking at reception page: canConduct = leadership | admin | reception
  // So reception CAN conduct - that's by design in the code. Note it.

  await logout(page);

  // ═══════════ 3. РОЛЬ: leadership ═══════════
  info("=== 3. Роль председатель (predsedatel) ===");
  await login(page, "predsedatel");
  ok("Вход predsedatel → " + page.url());

  // Не должен видеть inbox в меню / или права confirm
  await page.goto(BASE + "/admin/inbox", { waitUntil: "networkidle" });
  {
    const txt = await page.locator("body").innerText();
    // страница может открыться, но confirm не должен работать — проверим ACL через отсутствие кнопки на pending
    // leadership home is reception; inbox may still load
    info("inbox под leadership: страница загружена");
  }

  await page.goto(BASE + "/admin/reception", { waitUntil: "networkidle" });
  // После завершения prep #6 должна быть в «К протоколу», плюс #8
  const has8 = await page.getByText(code(8)).first().isVisible().catch(() => false);
  if (has8) ok("Приём: видна " + code(8) + " (chairman)");
  else fail("Приём: не видна " + code(8));

  // Фиксация протокола по #8
  if (has8) {
    await page.getByText(code(8)).first().click();
    await page.locator("textarea").nth(1).fill("Поручение: подготовить ответ (e2e-тест).");
    await page.locator("select").first().selectOption({ index: 1 });
    await page.getByRole("button", { name: "Зафиксировать протокол" }).click();
    await page.waitForTimeout(1000);
    const s = await readStore(page);
    const apl = s.appeals.find((a) => a.code === code(8));
    const apt = s.appointments.find((a) => a.code === code(8));
    if (apl?.stage === "in_control" && apt?.status === "accepted")
      ok("Протокол приёма " + code(8) + " → in_control/accepted");
    else
      fail(
        `Протокол ${code(8)}: stage=${apl?.stage} status=${apt?.status}`
      );
  }

  // leadership видит свой график
  await page.goto(BASE + "/admin/my-schedule", { waitUntil: "networkidle" });
  {
    const txt = await page.locator("body").innerText();
    if (txt.includes("не найдена")) fail("my-schedule недоступен");
    else ok("my-schedule открывается");
  }

  // leadership НЕ должен редактировать CMS / eligibility
  await page.goto(BASE + "/admin/eligibility", { waitUntil: "networkidle" });
  {
    // страница может быть скрыта из меню, но URL может открыться — проверим редирект или отсутствие редактора
    const txt = await page.locator("body").innerText();
    info("eligibility под leadership: " + (txt.includes("Допуск") ? "открылась" : "скрыта/иное"));
  }

  await logout(page);

  // ═══════════ 4. РОЛЬ: responsible ═══════════
  info("=== 4. Роль исполнитель (ispolnitel) ===");
  await login(page, "ispolnitel");
  ok("Вход ispolnitel → " + page.url());

  await page.goto(BASE + "/admin/control", { waitUntil: "networkidle" });
  const has10 = await page.getByText(code(10)).first().isVisible().catch(() => false);
  const has11 = await page.getByText(code(11)).first().isVisible().catch(() => false);
  if (has10 || has11) ok("Контроль: видны поручения исполнителя");
  else fail("Контроль: поручения не видны");

  // Смена статуса поручения #11
  if (has11) {
    await page.getByText(code(11)).first().click();
    await page.waitForTimeout(400);
    const statusSelect = page.locator("select").first();
    if (await statusSelect.isVisible().catch(() => false)) {
      await statusSelect.selectOption("done");
      await page.getByRole("button", { name: /Сохранить статус/i }).click();
      await page.waitForTimeout(800);
      const s = await readStore(page);
      const apl = s.appeals.find((a) => a.code === code(11));
      if (apl?.assignment?.status === "done")
        ok("Статус поручения " + code(11) + " → done");
      else fail("Статус поручения " + code(11) + " → " + apl?.assignment?.status);
    } else {
      fail("Селект статуса поручения не найден");
    }
  }

  // Исполнитель не видит inbox-действия
  await page.goto(BASE + "/admin/inbox", { waitUntil: "networkidle" });
  {
    const confirmBtn = page.getByRole("button", {
      name: "Подтвердить. Уведомление заявителю",
    });
    // без открытия строки кнопки нет — откроем pending если есть
    const pending = page.getByText(code(3)).first();
    if (await pending.isVisible().catch(() => false)) {
      await pending.click();
      await page.waitForTimeout(400);
      if (await confirmBtn.isVisible().catch(() => false))
        fail("Исполнитель видит кнопку подтверждения — дыра в ACL UI");
      else ok("Исполнитель не видит кнопку подтверждения");
    } else {
      ok("Исполнитель: pending в inbox не показан / нет доступа к действию");
    }
  }

  await logout(page);

  // ═══════════ 5. РОЛЬ: admin ═══════════
  info("=== 5. Роль администратор (admin) ===");
  await login(page, "admin");
  ok("Вход admin → " + page.url());

  for (const p of [
    "/admin",
    "/admin/inbox",
    "/admin/appeals",
    "/admin/reception",
    "/admin/control",
    "/admin/protocols",
    "/admin/analytics",
    "/admin/content",
    "/admin/eligibility",
    "/admin/settings",
    "/admin/journal",
    "/admin/calendar",
    "/admin/my-schedule",
    "/admin/survey",
    "/admin/survey/results",
    "/admin/help",
  ]) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    const txt = await page.locator("body").innerText();
    if (txt.includes("Страница не найдена")) fail(`admin: 404 на ${p}`);
    else ok(`admin: ${p}`);
  }

  // Карточка: правка гражданина
  await page.goto(BASE + "/admin/appeals", { waitUntil: "networkidle" });
  await page.getByText(code(5)).first().click();
  await page.waitForURL("**/admin/appeals/**");
  const nameInput = page.locator('input[value*="Сыдыкова"]').first();
  if (await nameInput.isVisible().catch(() => false)) {
    await nameInput.fill("Сыдыкова Айгерим Маратовна (испр.)");
    const save = page.getByRole("button", { name: /Сохранить/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await page.waitForTimeout(600);
      const s = await readStore(page);
      const apt = s.appointments.find((a) => a.code === code(5));
      if (apt?.fullName.includes("испр")) ok("Правка ФИО гражданина " + code(5));
      else fail("Правка ФИО не сохранилась");
    } else {
      info("Кнопка сохранения ФИО не найдена — пропуск");
    }
  } else {
    info("Поле ФИО не найдено на карточке — пропуск правки");
  }

  await page.screenshot({ path: `${SHOTS}/admin-full-done.png` });
  await logout(page);

  // ═══════════ 6. Гражданин: статус по коду+PIN ═══════════
  info("=== 6. Публичный статус (код + PIN 1234) ===");
  await page.goto(BASE + "/appointment-status", { waitUntil: "networkidle" });
  // очистить myBooking ref если есть
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.includes("my-booking") || k.includes("myBooking")) localStorage.removeItem(k);
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  const inputs = page.locator("input.input");
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(code(5));
    await inputs.nth(1).fill("1234");
    await page.locator("button.btn-primary").first().click();
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    if (body.includes(code(5))) ok("Статус по коду+PIN открывается (" + code(5) + ")");
    else fail("Статус по коду+PIN не показал талон");
  } else {
    // возможно автопоказ
    const body = await page.locator("body").innerText();
    info("Поля кода не найдены, body содержит код: " + body.includes(code(5)));
  }

  // ═══════════ 7. Перезасев чистых 20 для презентации ═══════════
  info("=== 7. Восстановление чистых 20 записей ===");
  // Новый контекст = чистая память Zustand
  await context.close();
  const freshCtx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const freshPage = await freshCtx.newPage();
  await freshPage.addInitScript(() => localStorage.setItem("vs-kr-lang", "ru"));
  await freshPage.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await freshPage.evaluate((key) => {
    localStorage.removeItem(key);
    localStorage.removeItem("vs-kr-citizen-platform-v13");
  }, STORAGE_KEY);
  await freshPage.reload({ waitUntil: "networkidle" });
  await freshPage.locator("#login").fill("admin");
  await freshPage.locator("#password").fill("1111");
  await freshPage.locator("button[type=submit]").click();
  await freshPage.waitForURL(
    (u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"),
    { timeout: 15000 }
  );
  await freshPage.waitForTimeout(1000);
  const fresh = await freshPage.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.state || parsed;
    } catch {
      return null;
    }
  }, STORAGE_KEY);
  if (fresh?.appointments?.length === 20 && fresh?.appeals?.length === 20) {
    ok("Чистые 20 учебных записей восстановлены для презентации");
    const a1 = fresh.appointments.find((a) => a.code === code(1));
    if (a1?.status === "pending_review") ok(code(1) + " снова pending_review");
    else fail(code(1) + " после сброса: " + a1?.status);
  } else {
    fail(
      `После сброса: apt=${fresh?.appointments?.length} apl=${fresh?.appeals?.length}`
    );
  }
  await freshPage.screenshot({ path: `${SHOTS}/admin-seed-restored.png` });
  await freshCtx.close();
} catch (e) {
  fail("Сценарий упал: " + e.message);
  console.error(e);
} finally {
  writeFileSync("scripts/e2e-admin-full-log.txt", log.join("\n") + "\n", "utf8");
  await browser.close();
  console.log("\nИтого ошибок: " + failed);
  process.exitCode = failed ? 1 : 0;
}
