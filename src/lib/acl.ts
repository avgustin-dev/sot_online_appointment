import type { Appointment, AppointmentStatus, Role, StaffUser } from "./types";

export type StaffActor = Pick<StaffUser, "id" | "role" | "targetId" | "fullName">;

export type Permission =
  | "confirmAppointment"
  | "rejectAppointment"
  | "cancelAppointment"
  | "rescheduleAppointment"
  | "viewAllAppointments"
  | "viewCard"
  | "editCitizenData"
  | "editContent"
  | "editEligibility"
  | "editAllSchedules"
  | "editOwnSchedule"
  | "editPlatformCalendar"
  | "editStaffList"
  | "assignExecutor"
  | "changeAssignmentStatus"
  | "viewAssignments"
  | "conductReception"
  | "prepCard"
  | "viewJournal"
  | "viewAnalytics";

const FULL: Permission[] = [
  "confirmAppointment",
  "rejectAppointment",
  "cancelAppointment",
  "rescheduleAppointment",
  "viewAllAppointments",
  "viewCard",
  "editCitizenData",
  "editContent",
  "editEligibility",
  "editAllSchedules",
  "editOwnSchedule",
  "editPlatformCalendar",
  "editStaffList",
  "assignExecutor",
  "changeAssignmentStatus",
  "viewAssignments",
  "conductReception",
  "prepCard",
  "viewJournal",
  "viewAnalytics",
];

const BY_ROLE: Record<Exclude<Role, "citizen">, Permission[]> = {
  admin: FULL,
  reception: [
    "confirmAppointment",
    "rejectAppointment",
    "cancelAppointment",
    "rescheduleAppointment",
    "viewAllAppointments",
    "viewCard",
    "editCitizenData",
    "editContent",
    "editOwnSchedule",
    "editPlatformCalendar",
    "editStaffList",
    "prepCard",
    "viewJournal",
    "viewAnalytics",
  ],
  leadership: [
    "rescheduleAppointment",
    "viewCard",
    "editOwnSchedule",
    "assignExecutor",
    // Только для поручений, где председатель сам себе исполнитель
    // («Исполнить самому») — фактическая проверка владения поручением
    // остаётся в storeLocal.ts (setAssignmentStatus/submitFinalAnswer).
    "changeAssignmentStatus",
    "viewAssignments",
    "conductReception",
  ],
  responsible: [
    "rescheduleAppointment",
    "viewCard",
    "editOwnSchedule",
    "changeAssignmentStatus",
    "viewAssignments",
  ],
};

export const ROLE_LABEL: Record<string, { ru: string; ky: string }> = {
  reception: { ru: "Приёмная", ky: "Кабыл алуу" },
  leadership: { ru: "Председатель", ky: "Төрага" },
  responsible: { ru: "Зам. Председателя", ky: "Орун басар" },
  admin: { ru: "Администратор", ky: "Администратор" },
};

export const DEMO_ACCOUNTS = [
  {
    login: "admin",
    password: "1111",
    role: "admin" as const,
    labelRu: "Администратор",
    labelKy: "Администратор",
  },
  {
    login: "spravochnaya",
    password: "1111",
    role: "reception" as const,
    labelRu: "Приёмная",
    labelKy: "Кабыл алуу",
  },
  {
    login: "predsedatel",
    password: "1111",
    role: "leadership" as const,
    labelRu: "Председатель",
    labelKy: "Төрага",
  },
  {
    login: "ispolnitel",
    password: "1111",
    role: "responsible" as const,
    labelRu: "Зам. Председателя",
    labelKy: "Орун басар",
  },
];

export const DENIED =
  "Недостаточно прав: действие не предусмотрено ролью пользователя.";

export function can(
  user: StaffActor | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  return (BY_ROLE[user.role] ?? []).includes(permission);
}

export function roleLabel(role: string, isKy = false): string {
  const row = ROLE_LABEL[role];
  if (!row) return role;
  return isKy ? row.ky : row.ru;
}

export function ownTargetId(
  user: StaffActor | null | undefined
): string | undefined {
  return user?.targetId || undefined;
}

export function seesAllQueue(
  user: StaffActor | null | undefined
): boolean {
  return can(user, "viewAllAppointments");
}

const AFTER_CONFIRM: AppointmentStatus[] = [
  "confirmed",
  "accepted",
  "rescheduled",
  "completed",
  "no_show",
];

/**
 * Очередь после подтверждения приёмной.
 * Председатель видит все такие записи (запись часто идёт на «приёмную»,
 * а не на его личный график). Зам. / исполнитель — только свой адресат.
 */
export function appointmentVisibleTo(
  user: StaffActor | null | undefined,
  apt: Pick<Appointment, "targetId" | "status">
): boolean {
  if (!user) return false;
  if (seesAllQueue(user)) return true;
  if (user.role === "leadership") {
    return AFTER_CONFIRM.includes(apt.status);
  }
  const mine = ownTargetId(user);
  if (!mine) return false;
  if (apt.targetId !== mine) return false;
  return AFTER_CONFIRM.includes(apt.status);
}

/**
 * Подтверждено приёмной, поручение ещё не выдано — очередь председателя:
 * назначить исполнителя или взять в работу самому.
 */
export function awaitingChairmanAssign(
  appeal: {
    stage: string;
    assignment?: { responsibleUserId?: string } | null;
  },
  apt: Pick<Appointment, "status"> | undefined
): boolean {
  if (!apt) return false;
  if (apt.status !== "confirmed" && apt.status !== "rescheduled") return false;
  if (appeal.assignment?.responsibleUserId) return false;
  return ["registered", "under_review", "ready_for_reception"].includes(
    appeal.stage
  );
}

/**
 * Статусы записи, которые можно выставить вручную из карточки: только
 * «административные» шаги (Поступила / Подтверждена / Перенесена / Отменена).
 *
 * «Принята» и «Завершена» намеренно НЕ входят сюда: это не свободный выбор,
 * а следствие реального события — «Принята» ставит только completeReception
 * (после того как приём проведён и протокол заполнен), «Завершена» — только
 * submitFinalAnswer (после того как исполнитель написал ответ гражданину).
 * Если разрешить их здесь, можно вручную «завершить» запись, ни разу не
 * проведя приём и не ответив гражданину — карточка обращения при этом
 * останется на прежнем этапе, и статус записи разойдётся с этапом карточки.
 */
export function allowedManualStatuses(
  user: StaffActor | null | undefined,
  apt: Pick<Appointment, "targetId" | "status">
): AppointmentStatus[] {
  if (!user) return [];
  if (!appointmentVisibleTo(user, apt) && !can(user, "viewAllAppointments")) {
    return [];
  }
  const options: AppointmentStatus[] = [];
  // Поступила — возврат на рассмотрение (регистратор / админ)
  if (can(user, "confirmAppointment") || can(user, "cancelAppointment")) {
    options.push("pending_review");
  }
  if (can(user, "confirmAppointment")) options.push("confirmed");
  if (can(user, "rescheduleAppointment")) options.push("rescheduled");
  if (can(user, "cancelAppointment") || can(user, "rejectAppointment")) {
    options.push("cancelled");
  }
  // Уникальные, в порядке ТЗ
  const order: AppointmentStatus[] = [
    "pending_review",
    "confirmed",
    "rescheduled",
    "cancelled",
  ];
  return order.filter((s) => options.includes(s));
}

export function canEditPersonSchedule(
  user: StaffActor | null | undefined,
  personId: string
): boolean {
  if (!user) return false;
  if (can(user, "editAllSchedules")) return true;
  if (!can(user, "editOwnSchedule")) return false;
  return ownTargetId(user) === personId;
}
