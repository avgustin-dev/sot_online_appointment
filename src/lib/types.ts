/** Цифровая платформа приёма граждан — доменные типы */

export type Role =
  | "citizen"
  | "reception" // отдел по работе с гражданами: журнал заявок
  | "leadership" // руководство / Председатель
  | "responsible" // ответственный по обращению
  | "admin";

export type AppealStage =
  | "registered" // Этап 1: запись создана
  | "under_review" // Этап 2: предварительное изучение
  | "ready_for_reception" // готово к личному приёму
  | "reception_done" // Этап 3: приём проведён
  | "in_control" // Этап 4: контроль исполнения
  | "closed" // ответ направлен гражданину, обращение завершено
  | "cancelled";

export type AppointmentStatus =
  | "pending_review"
  | "confirmed"
  /** Гражданин принят на личном приёме (см. п.5 ТЗ — статус «Принята»). */
  | "accepted"
  | "rescheduled"
  | "cancelled"
  | "rejected"
  | "completed"
  | "no_show";

export interface Companion {
  fullName: string;
  phone?: string;
}

export type AppealCategory =
  | "organization"
  | "court_activity"
  | "legislation"
  | "other";

export interface StaffUser {
  id: string;
  login: string;
  password?: string;
  fullName: string;
  role: Exclude<Role, "citizen">;
  position: string;
  department?: string;
  /** Связь с записью в content.leadership — какой график/приём "мой" (для leadership/responsible) */
  targetId?: string;
}

export interface CalendarSettings {
  /** Дни недели приёма: 0=вс … 6=сб */
  receptionWeekdays: number[];
  /** Начало рабочего окна, минуты от 00:00 (8:00 = 480) */
  dayStartMinutes: number;
  /** Конец окна, минуты от 00:00 */
  dayEndMinutes: number;
  /** Длительность слота, мин */
  slotDurationMinutes: number;
  /** Перерыв между слотами, мин */
  breakMinutes: number;
  /** Сколько дней вперёд открыта запись */
  bookingHorizonDays: number;
  /** Закрытые даты (YYYY-MM-DD) — перенос/выходные */
  closedDates: string[];
  /** Дополнительные открытые даты вне графика */
  extraOpenDates: string[];
  rulesText: string;
}

export interface TimeSlot {
  start: string; // HH:mm
  end: string; // HH:mm
  label: string; // "08:00 – 08:20"
}

export interface Appointment {
  id: string;
  code: string; // код для гражданина: VS-2026-XXXX
  fullName: string;
  phone: string;
  email?: string;
  pin: string; // 4-значный PIN для управления записью
  topic: string;
  region: string;
  locality: string;
  street: string;
  category: AppealCategory;
  description?: string;
  date: string; // YYYY-MM-DD
  slotStart: string;
  slotEnd: string;
  status: AppointmentStatus;
  /** К кому записан — id из ServiceContent.leadership */
  targetId: string;
  companions: Companion[];
  reviewNote?: string;
  /** Прежние дата и время — сохраняются при переносе. */
  previousDate?: string;
  previousSlotStart?: string;
  previousSlotEnd?: string;
  createdAt: string;
  updatedAt: string;
  history: AppointmentHistoryItem[];
}

/** Данные формы электронной записи (общие для локального и удалённого стора). */
export interface BookInput {
  fullName: string;
  phone: string;
  email?: string;
  topic: string;
  region: string;
  locality: string;
  street: string;
  category: AppealCategory;
  description?: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  targetId: string;
  companions?: { fullName: string; phone?: string }[];
}

export interface AppointmentHistoryItem {
  at: string;
  action: string;
  detail?: string;
  staffName?: string;
}

export interface AppealCard {
  id: string;
  appointmentId: string;
  code: string;
  fullName: string;
  phone: string;
  email?: string;
  topic: string;
  region: string;
  locality: string;
  street: string;
  category: AppealCategory;
  summary: string;
  stage: AppealStage;
  /** История обращений того же гражданина (по телефону/ФИО) */
  previousAppealIds: string[];
  previousNotes: string;
  prepNotes: string;
  prepCompletedBy?: string;
  prepCompletedAt?: string;
  receptionProtocol?: ReceptionProtocol;
  assignment?: Assignment;
  controlLog: ControlLogEntry[];
  finalAnswer?: string;
  finalAnswerAt?: string;
  feedback?: Feedback;
  notifications: NotificationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceptionProtocol {
  heldAt: string;
  heldBy: string;
  citizenStatement: string;
  leadershipExplanation: string;
  assignmentText: string;
  responsibleUserId: string;
  responsibleName: string;
  specialistsInvolved: string;
  notes?: string;
}

export type AssignmentStatus =
  | "not_assigned"
  | "assigned"
  | "in_progress"
  | "done";

export interface Assignment {
  text: string;
  responsibleUserId: string;
  responsibleName: string;
  dueDate: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface ControlLogEntry {
  id: string;
  at: string;
  authorId: string;
  authorName: string;
  action: string;
  comment: string;
}

export interface Feedback {
  respectful: number; // 1-5
  clearNextSteps: number;
  convenient: number;
  deadlinesMet: number;
  comment?: string;
  submittedAt: string;
}

export interface NotificationItem {
  id: string;
  at: string;
  channel: "system" | "email" | "sms";
  title: string;
  body: string;
  read: boolean;
}

/** ——— Опросник судов (модуль в разработке; opros.sot.kg) ——— */

export type SurveyQuestionType = "single" | "text";

export interface SurveyOption {
  id: string;
  textRu: string;
  textKy: string;
  /** Вариант «Другое» — можно ввести свой текст */
  isOther?: boolean;
}

export interface SurveyQuestion {
  id: string;
  order: number;
  type: SurveyQuestionType;
  required: boolean;
  enabled: boolean;
  textRu: string;
  textKy: string;
  options: SurveyOption[];
  /** Показывать вопрос только если выбран один из optionIds */
  showIf?: { questionId: string; optionIds: string[] };
}

export interface SurveyAnswerValue {
  optionId?: string;
  text?: string;
}

export interface SurveyResponse {
  id: string;
  at: string;
  courtName?: string;
  answers: Record<string, SurveyAnswerValue>;
}

export interface SurveyMeta {
  titleRu: string;
  titleKy: string;
  descriptionRu: string;
  descriptionKy: string;
  courtNameRu: string;
  courtNameKy: string;
}

/** CMS: тексты публичного сервиса приёма (редактируется в админке) */
export interface BookingRulesContent {
  titleRu: string;
  titleKy: string;
  welcomeRu: string;
  welcomeKy: string;
  rulesRu: string[];
  rulesKy: string[];
  cannotTitleRu: string;
  cannotTitleKy: string;
  cannotRu: string[];
  cannotKy: string[];
  deleteNoteRu: string;
  deleteNoteKy: string;
  agreeRu: string;
  agreeKy: string;
}

export interface CourtContactsContent {
  trustPhone: string;
  trustPhoneTel: string;
  addressRu: string;
  addressKy: string;
  /** Ссылка на карту (2ГИС и т.п.) */
  mapUrl?: string;
  receptionOfficeRu: string;
  receptionOfficeKy: string;
  sourceNoteRu: string;
  sourceNoteKy: string;
  scheduleFootnoteRu: string;
  scheduleFootnoteKy: string;
}

export interface LeadershipPerson {
  id: string;
  fullNameRu: string;
  fullNameKy: string;
  positionRu: string;
  positionKy: string;
  shortRu: string;
  shortKy: string;
  bookLabelRu: string;
  bookLabelKy: string;
  showInSchedule: boolean;
  bookable: boolean;
  /**
   * Единственный источник графика приёма этого лица — дублируется в
   * публичную часть (CourtContactsBlock) как есть, без отдельного текста.
   * Правка — только /admin/my-schedule (сам сотрудник или админ).
   */
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
}

export interface SiteNavLink {
  href: string;
  labelRu: string;
  labelKy: string;
}

export interface HubNavCard {
  href: string;
  labelRu: string;
  labelKy: string;
  descRu: string;
  descKy: string;
}

export interface ProcessStepContent {
  stageRu: string;
  stageKy: string;
  titleRu: string;
  titleKy: string;
  pointsRu: string[];
  pointsKy: string[];
}

export interface ServiceContent {
  orgNameRu: string;
  orgNameKy: string;
  appNameRu: string;
  appNameKy: string;
  navBookCtaRu: string;
  navBookCtaKy: string;
  headerNav: SiteNavLink[];
  hubNav: HubNavCard[];
  footerReceptionRu: string;
  footerReceptionKy: string;
  footerDisclaimerRu: string;
  footerDisclaimerKy: string;
  footerIndependenceRu: string;
  footerIndependenceKy: string;
  footerNoCasesRu: string;
  footerNoCasesKy: string;
  footerCitizensRu: string;
  footerCitizensKy: string;
  footerHelpRu: string;
  footerHelpKy: string;
  footerImportantRu: string;
  footerImportantKy: string;
  hubKickerRu: string;
  hubKickerKy: string;
  hubTitleRu: string;
  hubTitleKy: string;
  hubLeadRu: string;
  hubLeadKy: string;
  hubCtaRu: string;
  hubCtaKy: string;
  memoTitleRu: string;
  memoTitleKy: string;
  memoItemsRu: string[];
  memoItemsKy: string[];
  allowedTitleRu: string;
  allowedTitleKy: string;
  forbiddenTitleRu: string;
  forbiddenTitleKy: string;
  allowedRu: string[];
  allowedKy: string[];
  forbiddenRu: string[];
  forbiddenKy: string[];
  cycleTitleRu: string;
  cycleTitleKy: string;
  cycleLeadRu: string;
  cycleLeadKy: string;
  bookTitleRu: string;
  bookTitleKy: string;
  bookSubtitleRu: string;
  bookSubtitleKy: string;
  bookTargetHintRu: string;
  bookTargetHintKy: string;
  contacts: CourtContactsContent;
  leadership: LeadershipPerson[];
  processNoticeRu: string;
  processNoticeKy: string;
  processSteps: ProcessStepContent[];
  rules: BookingRulesContent;
}

export type AdminModule = "reception" | "survey";

/** Дерево допуска (сереализуемая копия EligibilityNode) */
export type EligibilityTreeNode = {
  id: string;
  labelRu: string;
  labelKy: string;
  children?: EligibilityTreeNode[];
  allowed?: boolean;
  category?: AppealCategory;
  topicRu?: string;
  topicKy?: string;
  refusal?: {
    greetingRu: string;
    greetingKy: string;
    bodyRu: string[];
    bodyKy: string[];
    closingRu: string;
    closingKy: string;
  };
};

export interface ActionLogEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: string;
  entity: "appointment" | "schedule" | "assignment" | "content";
  entityId?: string;
  detail?: string;
}

export interface PlatformState {
  version: number;
  calendar: CalendarSettings;
  staff: StaffUser[];
  appointments: Appointment[];
  appeals: AppealCard[];
  session: { userId: string } | null;
  surveyMeta: SurveyMeta;
  surveyQuestions: SurveyQuestion[];
  surveyResponses: SurveyResponse[];
  serviceContent: ServiceContent;
  adminModule: AdminModule;
  /** Дерево шага «Допуск» — редактируется в CMS */
  eligibilityTree: EligibilityTreeNode[];
  /** Журнал действий (локальный контур без бэкенда) */
  actionLog?: ActionLogEntry[];
}
