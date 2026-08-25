import { catalog, cloneCatalog } from "./catalog";
import { SEED_SURVEY_META, SEED_SURVEY_QUESTIONS } from "./surveySeed";
import { mergeServiceContent } from "./serviceContent";
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
  // восстанавливаем пароль из сида, чтобы демо-вход не ломался.
  let repaired = false;
  const withPasswords = staff.map((s) => {
    if (s.password) return s;
    const seedMatch = SEED_STAFF.find(
      (seed) => seed.login.toLowerCase() === s.login.toLowerCase()
    );
    if (!seedMatch) return s;
    repaired = true;
    return { ...s, password: seedMatch.password };
  });
  if (!missing.length && !repaired) return staff;
  return [...withPasswords, ...missing];
}

/**
 * Стартовое состояние платформы: только реальная конфигурация (учётки,
 * график, контент сайта, дерево допуска, вопросы опроса) — без демонстрационных
 * заявок/обращений/журнала действий. Они не нужны на презентации и должны
 * появляться только по факту реальной работы с системой.
 */
export function buildSeedState(): PlatformState {
  const calendar: CalendarSettings = {
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

  const appointments: Appointment[] = [];
  const appeals: AppealCard[] = [];
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
