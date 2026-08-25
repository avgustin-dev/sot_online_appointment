/**
 * DTO контракта /api/v1 — то, что ждёт фронт от Java-бэкенда.
 * Поля camelCase. Даты: ISO-8601. День: YYYY-MM-DD. Время слота: HH:mm.
 * Часовой пояс: Asia/Bishkek.
 */
export type {
  AppealCard,
  AppealCategory,
  AppealStage,
  Appointment,
  AppointmentStatus,
  CalendarSettings,
  Companion,
  ControlLogEntry,
  EligibilityTreeNode,
  Feedback,
  ReceptionProtocol,
  Role,
  ServiceContent,
  StaffUser,
  SurveyAnswerValue,
  SurveyMeta,
  SurveyQuestion,
  SurveyResponse,
  TimeSlot,
} from "@/lib/types";

export type { StaffProfile } from "@/lib/staff";

export type ApiErrorBody = {
  status: number;
  /** Машинный код, например SLOT_UNAVAILABLE */
  code: string;
  message: string;
};

export type LoginRequest = {
  login: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: import("@/lib/staff").StaffProfile;
};

export type CompanionInput = {
  fullName: string;
  phone?: string;
};

export type BookAppointmentRequest = {
  fullName: string;
  phone: string;
  email?: string;
  topic: string;
  region: string;
  locality: string;
  street: string;
  category: import("@/lib/types").AppealCategory;
  description?: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  targetId: string;
  companions?: CompanionInput[];
};

/** PIN выдаётся только при создании. В последующих ответах его нет. */
export type BookAppointmentResponse = {
  code: string;
  pin: string;
  appointment: PublicAppointment;
};

export type PublicAppointment = Omit<
  import("@/lib/types").Appointment,
  "pin"
>;

export type PublicAppointmentLookup = {
  appointment: PublicAppointment;
  appealStage?: import("@/lib/types").AppealStage;
  feedback?: import("@/lib/types").Feedback;
  latestNotification?: { title: string; body: string };
};

export type UnlockAppointmentRequest = { pin: string };

export type CitizenAppointmentActionRequest = {
  pin: string;
  action: "cancel" | "reschedule";
  date?: string;
  slotStart?: string;
  slotEnd?: string;
};

export type RecoverCodesRequest = { phone: string };
export type RecoverCodesResponse = { codes: string[] };

export type FeedbackRequest = {
  respectful: number;
  clearNextSteps: number;
  convenient: number;
  deadlinesMet: number;
  comment?: string;
};

export type SubmitSurveyRequest = {
  courtName?: string;
  answers: Record<string, import("@/lib/types").SurveyAnswerValue>;
};

export type SlotDayResponse = {
  date: string;
  targetId: string;
  slots: import("@/lib/types").TimeSlot[];
};

export type AvailableDatesResponse = {
  targetId: string;
  dates: string[];
};

export type PublicBootstrap = {
  site: import("@/lib/types").ServiceContent;
  eligibilityTree: import("@/lib/types").EligibilityTreeNode[];
  calendar: import("@/lib/types").CalendarSettings;
  survey: {
    meta: import("@/lib/types").SurveyMeta;
    questions: import("@/lib/types").SurveyQuestion[];
  };
};

export type AppointmentListQuery = {
  status?: import("@/lib/types").AppointmentStatus;
  date?: string;
  targetId?: string;
};

export type ConfirmAppointmentRequest = { note?: string };
export type RejectAppointmentRequest = { reason: string };
export type CancelAppointmentRequest = { reason?: string };

export type SetAppointmentStatusRequest = {
  status: import("@/lib/types").AppointmentStatus;
  note?: string;
};

export type RescheduleAppointmentRequest = {
  date: string;
  slotStart: string;
  slotEnd: string;
};

export type PatchAppointmentRequest = {
  fullName?: string;
  phone?: string;
  email?: string;
  topic?: string;
  category?: import("@/lib/types").AppealCategory;
  description?: string;
};

export type AppealListQuery = {
  stage?: import("@/lib/types").AppealStage;
};

export type CompletePrepRequest = {
  summary: string;
  prepNotes: string;
  category: import("@/lib/types").AppealCategory;
};

export type CompleteReceptionRequest = Omit<
  import("@/lib/types").ReceptionProtocol,
  "heldAt" | "heldBy"
>;

export type AddControlLogRequest = {
  action: string;
  comment: string;
};

export type SetAssignmentStatusRequest = {
  status: "not_assigned" | "assigned" | "in_progress" | "done" | "needs_rework";
};

export type LeadershipScheduleRequest = {
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
};

export type AssignExecutorRequest = {
  responsibleUserId: string;
  responsibleName: string;
  text: string;
};

export type SubmitFinalAnswerRequest = { answer: string };

export type SetAppealStageRequest = {
  stage: import("@/lib/types").AppealStage;
  note?: string;
};

export type AnalyticsResponse = {
  byStage: Record<string, number>;
  byCategory: Record<string, number>;
  quality: {
    count: number;
    respectful: number;
    clearNextSteps: number;
    convenient: number;
    deadlinesMet: number;
    overall: number;
  };
  repeated: {
    name: string;
    phone: string;
    count: number;
    themes: string[];
    codes: string[];
    ids: string[];
  }[];
  topThemes: { theme: string; count: number }[];
};

export type EligibilityTreePayload = {
  nodes: import("@/lib/types").EligibilityTreeNode[];
};

export type SurveyAdminBundle = {
  meta: import("@/lib/types").SurveyMeta;
  questions: import("@/lib/types").SurveyQuestion[];
};
