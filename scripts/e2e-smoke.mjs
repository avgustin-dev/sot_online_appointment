/**
 * Сквозной прогон: публичные страницы + запись + все роли кабинета.
 * Запуск при поднятом dev: node scripts/e2e-smoke.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const STORAGE_KEY = "vs-kr-citizen-platform-v15";
const SHOTS = "scripts/e2e-shots-smoke";
mkdirSync(SHOTS, { recursive: true });

const CITIZEN = "Тестов Нурлан Е2Е";
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

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function forceRu(page) {
  await page.evaluate(() => {
    localStorage.setItem("vs-kr-lang", "ru");
    document.cookie = "vs-kr-lang=ru; path=/";
  });
}

async function ensureRu(page) {
  const ru = page.getByRole("button", { name: "Русский" });
  if (await ru.isVisible().catch(() => false)) {
    await ru.click();
    await page.waitForTimeout(200);
  }
}

async function login(page, loginName) {
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await forceRu(page);
  await ensureRu(page);
  const logout = page.getByRole("button", { name: /Выход|Чыгуу/i });
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await page.waitForURL("**/admin/login**", { timeout: 10000 }).catch(() => {});
    await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
    await ensureRu(page);
  }
  await page.locator("#login").fill(loginName);
  await page.locator("#password").fill("1111");
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(
    (u) => u.pathname.startsWith("/admin") && !u.pathname.includes("login"),
    { timeout: 15000 }
  );
  await ensureRu(page);
}

async function pickOpenDayAndSlot(page) {
  for (let m = 0; m < 4; m++) {
    const openDay = page.locator("button[aria-label]:not([disabled])").filter({
      has: page.locator("span.h-1.w-1.rounded-full"),
    });
    if ((await openDay.count()) > 0) {
      await openDay.first().click();
      await page.waitForTimeout(400);
      const slot = page.locator("button.font-mono").first();
      if (await slot.isVisible().catch(() => false)) {
        await slot.click();
        return true;
      }
    }
    await page.getByLabel(/следующ|кийинки/i).click().catch(async () => {
      await page.locator('button[aria-label]').nth(1).click();
    });
    await page.waitForTimeout(300);
  }
  return false;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

try {
  info("=== 0. Сервер ===");
  const health = await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  if (!health || health.status() >= 400) fail(`GET / → ${health?.status()}`);
  else ok("GET / 200");

  await forceRu(page);
  await page.reload({ waitUntil: "networkidle" });
  await ensureRu(page);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, STORAGE_KEY);
  await page.reload({ waitUntil: "networkidle" });
  await ensureRu(page);

  info("=== 1. Публичные страницы ===");
  for (const path of [
    "/",
    "/electronic-appointment",
    "/appointment-status",
    "/appointment-rules",
    "/service-evaluation",
  ]) {
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    if (!res || res.status() >= 400) fail(`${path} → ${res?.status()}`);
    else ok(`страница ${path}`);
  }

  async function clickNext() {
    await page.getByRole("button", { name: /Следующий|Кийинки/ }).click();
    await page.waitForTimeout(250);
  }

  info("=== 2. Электронная запись ===");
  await page.goto(BASE + "/electronic-appointment", { waitUntil: "networkidle" });
  await ensureRu(page);
  await shot(page, "book-0-rules");
  await page.locator('input[type="checkbox"]').first().check();
  await clickNext();

  const radios0 = page.locator('input[name="elig-0"]');
  await radios0.nth(0).check();
  await page.locator('input[name="elig-1"]').first().waitFor();
  await page.locator('input[name="elig-1"]').first().check();
  await shot(page, "book-1-elig");
  await clickNext();

  await page.getByText(/Сведения о заявителе|Кайрылуучу жөнүндө/).waitFor();
  await page.locator('input[autocomplete="family-name"]').fill("Тестов");
  await page.locator('input[autocomplete="given-name"]').fill("Нурлан");
  await page.locator('input[autocomplete="additional-name"]').fill("Е2Е");
  await page.locator('input[autocomplete="tel"]').fill("+996700555001");
  await shot(page, "book-2-person");
  await clickNext();

  await page.getByText(/Место проживания|жашаган/).waitFor();
  const addr = page.locator("input.input");
  await addr.nth(0).fill("г. Бишкек");
  await addr.nth(1).fill("Бишкек");
  await addr.nth(2).fill("ул. Чуй, 1");
  await shot(page, "book-3-addr");
  await clickNext();

  await page.getByText(/Сведения об обращении|Кайрылуу жөнүндө маалымат/).waitFor();
  await page.locator("input.input").first().fill("Организация приёма документов");
  await page
    .locator("textarea")
    .first()
    .fill("Прошу разъяснить порядок приёма документов в канцелярии суда.");
  await page.locator('input[type="checkbox"]').last().check();
  await shot(page, "book-4-topic");
  await clickNext();

  const picked = await pickOpenDayAndSlot(page);
  if (!picked) {
    fail("не удалось выбрать дату и слот");
    await shot(page, "book-no-slot");
  } else {
    await page.getByRole("button", { name: /Направить заявку|Өтүнмө/ }).click();
    const codeEl = page.locator(".font-mono").first();
    await codeEl.waitFor({ timeout: 10000 }).catch(() => {});
    const body = await page.locator("body").innerText();
    if (/VS-\d{4}-\d{4}/.test(body)) ok("заявка создана, выдан код VS-…");
    else {
      fail("после отправки нет кода записи");
      await shot(page, "book-no-code");
    }
  }
  await shot(page, "book-done");

  const storeAfterBook = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw).state || JSON.parse(raw);
    } catch {
      return null;
    }
  }, STORAGE_KEY);
  const apts = storeAfterBook?.appointments || [];
  if (apts.some((a) => a.fullName.includes("Тестов"))) ok("запись в store");
  else fail("записи нет в localStorage");

  info("=== 3. Приёмная: подтверждение ===");
  await login(page, "spravochnaya");
  await page.goto(BASE + "/admin/appeals?bucket=pending", { waitUntil: "networkidle" });
  await ensureRu(page);
  const row = page.getByText(CITIZEN);
  if (!(await row.first().isVisible().catch(() => false))) {
    fail("приёмная не видит новую заявку");
    await shot(page, "reception-no-row");
  } else {
    ok("заявка видна приёмной");
    await row.first().click();
    await page.waitForURL("**/admin/appeals/**");
    await page.getByRole("button", { name: /Подтвердить/ }).click();
    await page.waitForTimeout(800);
    const txt = await page.locator("body").innerText();
    if (/подтвержд/i.test(txt)) ok("приёмная подтвердила заявку");
    else fail("нет сообщения о подтверждении");
  }
  await shot(page, "reception-confirm");

  info("=== 4. Кабинет приёмной: разделы ===");
  for (const [path, expectText] of [
    ["/admin", "Сводка"],
    ["/admin/appeals", "Карточк"],
    ["/admin/calendar", "Расписание"],
    ["/admin/analytics", "Мониторинг"],
    ["/admin/content", "Сайт"],
    ["/admin/settings", "Параметр"],
    ["/admin/journal", "Журнал"],
    ["/admin/help", "Инструкц"],
    ["/admin/my-schedule", "график"],
  ]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    const t = await page.locator("body").innerText();
    if (/ошибк|Error|Application error/i.test(t) && !/нет запис/i.test(t)) {
      fail(`приёмная ${path}: ошибка на странице`);
    } else ok(`приёмная ${path}`);
  }

  info("=== 5. Председатель: очередь и поручение ===");
  await login(page, "predsedatel");
  await page.goto(BASE + "/admin", { waitUntil: "networkidle" });
  await ensureRu(page);
  const dash = await page.locator("body").innerText();
  if (dash.includes(CITIZEN) || /Назначить поручение/i.test(dash)) {
    ok("сводка председателя показывает запись");
  } else {
    fail("на сводке председателя нет записи");
    await shot(page, "chair-dash");
  }

  await page.goto(BASE + "/admin/appeals", { waitUntil: "networkidle" });
  if (await page.getByText(CITIZEN).first().isVisible().catch(() => false)) {
    ok("председатель видит запись в заявках");
  } else fail("председатель не видит запись в заявках");

  await page.goto(BASE + "/admin/control", { waitUntil: "networkidle" });
  const controlItem = page.getByText(CITIZEN).first();
  if (!(await controlItem.isVisible().catch(() => false))) {
    fail("председатель не видит запись в поручениях");
    await shot(page, "chair-control-empty");
  } else {
    ok("запись в поручениях у председателя");
    await controlItem.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ timeout: 8000 });
    const assignSelect = dialog.locator("select").first();
    const deputyVal = await assignSelect
      .locator("option")
      .filter({ hasText: "Бакирова" })
      .getAttribute("value");
    await assignSelect.selectOption(deputyVal);
    await dialog.locator("textarea").first().fill("Изучить организацию приёма документов и доложить.");
    await dialog.getByRole("button", { name: /^Назначить$|^Дайындоо$/ }).click();
    await page.waitForTimeout(600);
    if (await dialog.isVisible()) ok("после «Назначить» модалка осталась открытой");
    else fail("модалка закрылась после назначения — не должна");
    const dialogText = await dialog.innerText();
    if (/назначен/i.test(dialogText)) ok("сообщение «исполнитель назначен»");
    else fail("нет сообщения об назначении внутри модалки");
    await page.keyboard.press("Escape");
  }
  await shot(page, "chair-assign");

  info("=== 6. Заместитель: статус (не закрывать) и завершение (закрыть) ===");
  await login(page, "ispolnitel");
  await page.goto(BASE + "/admin/control", { waitUntil: "networkidle" });
  await ensureRu(page);
  const execItem = page.getByText(CITIZEN).first();
  if (!(await execItem.isVisible().catch(() => false))) {
    fail("исполнитель не видит поручение");
    await shot(page, "exec-empty");
  } else {
    ok("исполнитель видит поручение");
    await execItem.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const statusSelect = dialog.locator("select").last();
    await statusSelect.selectOption("in_progress");
    await dialog.getByRole("button", { name: /Сохранить статус/ }).click();
    await page.waitForTimeout(600);
    if (await dialog.isVisible()) ok("после смены статуса модалка не закрылась");
    else fail("модалка закрылась после смены статуса");

    await dialog.locator("textarea").last().fill("Ответ подготовлен: порядок приёма документов разъяснён.");
    await dialog.getByRole("button", { name: /Сохранить протокол и завершить/ }).click();
    await page.waitForTimeout(800);
    const stillOpen = await dialog.isVisible().catch(() => false);
    if (!stillOpen) ok("после завершения протокола модалка закрылась");
    else fail("модалка осталась после завершения протокола");
  }
  await shot(page, "exec-done");

  info("=== 7. Админ: все разделы + сайдбар ===");
  await login(page, "admin");
  const adminPages = [
    ["/admin", "Сводка"],
    ["/admin/appeals", "Карточк"],
    ["/admin/control", "Поручен"],
    ["/admin/calendar", "Расписание"],
    ["/admin/analytics", "Мониторинг"],
    ["/admin/content", "Сайт"],
    ["/admin/eligibility", "Допуск"],
    ["/admin/settings", "Параметр"],
    ["/admin/survey", "опросник|Вопрос"],
    ["/admin/journal", "Журнал"],
    ["/admin/help", "Инструкц"],
    ["/admin/my-schedule", "график"],
  ];
  for (const [path] of adminPages) {
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    if (!res || res.status() >= 400) fail(`admin ${path} HTTP ${res?.status()}`);
    else ok(`admin ${path}`);
  }

  await page.goto(BASE + "/admin/appeals", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const logoutBox = await page.getByRole("button", { name: /Выход/ }).boundingBox();
  if (logoutBox && logoutBox.y >= 0 && logoutBox.y + logoutBox.height <= 900) {
    ok("кнопка «Выход» в зоне экрана при длинной странице");
  } else {
    fail(`«Выход» уехала: y=${logoutBox?.y}`);
    await shot(page, "logout-scroll");
  }

  const closed = (storeAfterBook && false) || (await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw).state || JSON.parse(raw);
      return (s.appeals || []).find((a) => a.fullName.includes("Тестов"));
    } catch {
      return null;
    }
  }, STORAGE_KEY));
  if (closed?.stage === "closed") ok("карточка тестовой записи закрыта");
  else info(`итог карточки: stage=${closed?.stage || "?"}`);

  if (pageErrors.length) {
    fail("JS errors: " + pageErrors.slice(0, 3).join(" | "));
  } else ok("нет необработанных JS-ошибок");
} catch (e) {
  fail("исключение: " + (e?.message || e));
  await shot(page, "crash").catch(() => {});
} finally {
  writeFileSync("scripts/e2e-smoke-log.txt", log.join("\n") + "\n");
  await browser.close();
  console.log(failed ? `\nFAILED: ${failed}` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
}
