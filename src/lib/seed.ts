import { catalog, cloneCatalog } from "./catalog";
import { SEED_SURVEY_META, SEED_SURVEY_QUESTIONS } from "./surveySeed";
import { mergeServiceContent } from "./serviceContent";
import { buildDemoDataset } from "./demoSeed";
import { useDemoData } from "@/config/env";
import type {
  ActionLogEntry,
  AppealCard,
  Appointment,
  CalendarSettings,
  PlatformState,
  StaffUser,
} from "./types";

export const SEED_STAFF: StaffUser[] = [
  {
    id: "u-admin",
    login: "admin",
    password: "1111",
    fullName: "Администратор платформы",
    role: "admin",
    position: "Администратор",
    department: "Цифровая платформа",
  },
  {
    id: "u-reception",
    login: "spravochnaya",
    password: "1111",
    fullName: "Касымова Айгуль Бакытовна",
    role: "reception",
    position: "Специалист справочной",
    department: "Общественная приёмная",
    targetId: "reception",
  },
  {
    id: "u-chair",
    login: "predsedatel",
    password: "1111",
    fullName: "Сатыев Медербек Асанбекович",
    role: "leadership",
    position: "Председатель Верховного суда КР",
    department: "Руководство",
    targetId: "chairman",
  },
  {
    id: "u-deputy",
    login: "ispolnitel",
    password: "1111",
    fullName: "Бакирова Нургуль Жакыповна",
    role: "responsible",
    position: "Заместитель Председателя Верховного суда КР",
    department: "Руководство",
    targetId: "deputy_bakirova",
  },
];

/** Добавляет недостающих демо-сотрудников, не затирая уже сохранённый штат. */
export function ensureSeedStaff(staff: StaffUser[]): StaffUser[] {
  const logins = new Set(staff.map((s) => s.login.toLowerCase()));
  const missing = SEED_STAFF.filter((s) => !logins.has(s.login.toLowerCase()));
  // Демо-учётки не должны остаться без пароля: если у известного демо-логина
  // пароль пуст (например, был затёрт старой версией hydrateStaffSession),
  // восстанавливаем пароль из сида, чтобы демо-вход не ломался. Аналогично
  // подтягиваем targetId, если в сохранённом штате его ещё нет (например,
  // справочная получила свой график только в новой версии сида).
  let repaired = false;
  const withPasswords = staff.map((s) => {
    const seedMatch = SEED_STAFF.find(
      (seed) => seed.login.toLowerCase() === s.login.toLowerCase()
    );
    if (!seedMatch) return s;
    const needsPassword = !s.password;
    const needsTargetId = !s.targetId && seedMatch.targetId;
    if (!needsPassword && !needsTargetId) return s;
    repaired = true;
    return {
      ...s,
      password: needsPassword ? seedMatch.password : s.password,
      targetId: needsTargetId ? seedMatch.targetId : s.targetId,
    };
  });
  if (!missing.length && !repaired) return staff;
  return [...withPasswords, ...missing];
}

/**
 * График приёма по умолчанию: и для локального сида, и до ответа /public/bootstrap.
 */
export function defaultCalendar(): CalendarSettings {
  return {
    receptionWeekdays: [2, 4],
    dayStartMinutes: 8 * 60,
    dayEndMinutes: 12 * 60,
    slotDurationMinutes: 20,
    breakMinutes: 5,
    bookingHorizonDays: 45,
    closedDates: [],
    extraOpenDates: [],
    rulesText: catalog.calendarRules.rulesText,
  };
}

/**
 * Стартовое состояние платформы.
 * При NEXT_PUBLIC_DEMO !== "false" (локальный контур) — 20 учебных заявок
 * на все этапы цикла. Без демо — пустые списки.
 */
export function buildSeedState(): PlatformState {
  const calendar = defaultCalendar();
  const demo = useDemoData ? buildDemoDataset() : null;
  const appointments: Appointment[] = demo?.appointments ?? [];
  const appeals: AppealCard[] = demo?.appeals ?? [];
  const actionLog: ActionLogEntry[] = [];

  return {
    version: 11,
    calendar,
    staff: SEED_STAFF.map((s) => ({ ...s })),
    appointments,
    appeals,
    session: null,
    surveyMeta: { ...SEED_SURVEY_META },
    surveyQuestions: SEED_SURVEY_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    surveyResponses: [],
    serviceContent: mergeServiceContent(cloneCatalog(catalog.site)),
    adminModule: "reception",
    eligibilityTree: cloneCatalog(catalog.eligibilityTree),
    actionLog,
  };
}
