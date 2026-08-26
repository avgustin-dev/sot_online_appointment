import type { Appointment, AppointmentStatus, Role, StaffUser } from "./types";

export type StaffActor = Pick<StaffUser, "id" | "role" | "targetId" | "fullName">;

export type Permission =
  | "viewInbox"
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
  | "editStaffList"
  | "assignExecutor"
  | "changeAssignmentStatus"
  | "viewAssignments"
  | "conductReception"
  | "prepCard"
  | "viewJournal"
  | "viewAnalytics"
  | "markAccepted";

const FULL: Permission[] = [
  "viewInbox",
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
  "editStaffList",
  "assignExecutor",
  "changeAssignmentStatus",
  "viewAssignments",
  "conductReception",
  "prepCard",
  "viewJournal",
  "viewAnalytics",
  "markAccepted",
];

const BY_ROLE: Record<Exclude<Role, "citizen">, Permission[]> = {
  admin: FULL,
  reception: [
    "viewInbox",
    "confirmAppointment",
    "rejectAppointment",
    "cancelAppointment",
    "rescheduleAppointment",
    "viewAllAppointments",
    "viewCard",
    "editCitizenData",
    "editContent",
    "editAllSchedules",
    "editOwnSchedule",
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
    "viewAssignments",
    "conductReception",
    "markAccepted",
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
  reception: { ru: "Справочная", ky: "Маалымдама" },
  leadership: { ru: "Председатель", ky: "Төрага" },
  responsible: { ru: "Исполнитель", ky: "Аткаруучу" },
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
    labelRu: "Справочная",
    labelKy: "Маалымдама",
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
    labelRu: "Исполнитель",
    labelKy: "Аткаруучу",
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

/** Заявки «на личный приём» председателя / исполнителя — только свой адресат. */
export function appointmentVisibleTo(
  user: StaffActor | null | undefined,
  apt: Pick<Appointment, "targetId" | "status">
): boolean {
  if (!user) return false;
  if (seesAllQueue(user)) return true;
  const mine = ownTargetId(user);
  if (!mine) return false;
  if (apt.targetId !== mine) return false;
  return [
    "confirmed",
    "accepted",
    "rescheduled",
    "completed",
    "no_show",
  ].includes(apt.status);
}

/**
 * Статусы записи, которые роль пользователя может установить вручную через
 * форму «Статус записи» на карточке обращения — без «мёртвых» пунктов,
 * которые выглядят выбираемыми, но на деле всегда отклоняются.
 *
 * "rescheduled" сюда никогда не входит: перенос выполняется отдельной формой
 * («Перенести») и переводит запись в этот статус автоматически — прямая
 * установка статуса «Перенесена» технически не предусмотрена.
 *
 * "pending_review" также не включён: для возврата записи «в поступившие»
 * есть отдельное действие «Вернуть в ожидание» (staffRestoreAppointment),
 * которое, в отличие от этой формы, согласованно возвращает и этап
 * обращения на «Регистрация». Через универсальную форму статус менялся бы
 * в отрыве от этапа — это и вызывало ощущение «сделал — и пропало».
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
  if (can(user, "confirmAppointment")) options.push("confirmed");
  if (can(user, "rejectAppointment")) options.push("rejected");
  if (can(user, "cancelAppointment")) options.push("cancelled", "no_show");
  if (user.role === "admin" || can(user, "markAccepted")) {
    options.push("accepted", "completed");
  }
  return Array.from(new Set(options));
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
