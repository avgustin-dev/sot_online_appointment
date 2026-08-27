import type { AppealCategory, AppealStage, AppointmentStatus } from "./types";
import { catalog } from "./catalog";

const d = catalog.dictionaries;

export const APP_NAME = d.appName;
export const ORG_NAME = d.orgName;
export const ORG_SHORT = d.orgShort;

export const CATEGORY_LABELS = d.categories as Record<AppealCategory, string>;
export const STAGE_LABELS = d.stages as Record<AppealStage, string>;
export const STATUS_LABELS = d.statuses as Record<AppointmentStatus, string>;

export const STAGE_ORDER: AppealStage[] = [
  "registered",
  "under_review",
  "ready_for_reception",
  "reception_done",
  "in_control",
  "closed",
];

/**
 * Куда можно вручную перевести карточку из формы «Этап обращения» —
 * только шаги подготовки (до личного приёма). Дальше этапа
 * "ready_for_reception" карточка двигается только настоящими действиями:
 * completeReception → "in_control", submitFinalAnswer → "closed" (ответ
 * гражданину и есть завершение работы сотрудников — оценка гражданина
 * на это уже не влияет), staffCancelAppointment → "cancelled".
 * Эти действия одновременно меняют и статус записи — свободный выбор этапа
 * здесь этого не делает и поэтому мог бы рассинхронизировать карточку
 * и запись (см. историю правок статусов).
 */
export const APPEAL_STAGE_MANUAL_TRANSITIONS: Record<AppealStage, AppealStage[]> = {
  registered: ["under_review"],
  under_review: ["registered", "ready_for_reception"],
  ready_for_reception: ["under_review"],
  reception_done: [],
  in_control: [],
  closed: [],
  cancelled: [],
};

export const PIPELINE_STEPS = d.pipeline;
export const RECEPTION_ALLOWED = d.allowed;
export const RECEPTION_FORBIDDEN = d.forbidden;
export const REGIONS_KR = d.regions;
export const COURT_CONTACTS = d.contacts;
export const APPLICANT_TYPES = d.applicantTypes;
export const FEEDBACK_QUESTIONS = d.feedbackQuestions as {
  key: "convenient" | "clearNextSteps" | "respectful" | "deadlinesMet";
  label: string;
  labelKy: string;
}[];
