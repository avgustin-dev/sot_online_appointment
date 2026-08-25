import type { Appointment, Role, StaffUser } from "./types";

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
    labelRu: "Администратор (вся админка)",
    labelKy: "Администратор (толук кабинет)",
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

export function canEditPersonSchedule(
  user: StaffActor | null | undefined,
  personId: string
): boolean {
  if (!user) return false;
  if (can(user, "editAllSchedules")) return true;
  if (!can(user, "editOwnSchedule")) return false;
  return ownTargetId(user) === personId;
}

const PATH_RULES: { prefix: string; anyOf: Permission[] }[] = [
  { prefix: "/admin/inbox", anyOf: ["viewInbox"] },
  { prefix: "/admin/content", anyOf: ["editContent", "editStaffList"] },
  { prefix: "/admin/eligibility", anyOf: ["editEligibility"] },
  { prefix: "/admin/analytics", anyOf: ["viewAnalytics"] },
  { prefix: "/admin/control", anyOf: ["viewAssignments"] },
  { prefix: "/admin/settings", anyOf: ["editAllSchedules", "editOwnSchedule"] },
  { prefix: "/admin/journal", anyOf: ["viewJournal"] },
  { prefix: "/admin/intake", anyOf: ["viewInbox"] },
];

export function canOpenPath(
  user: StaffActor | null | undefined,
  pathname: string
): boolean {
  if (!user) return false;
  if (pathname === "/admin" || pathname === "/admin/help") return true;
  if (pathname.startsWith("/admin/survey")) return user.role === "admin";
  if (
    pathname.startsWith("/admin/reception") ||
    pathname.startsWith("/admin/calendar") ||
    pathname.startsWith("/admin/appeals")
  ) {
    return can(user, "viewCard") || can(user, "viewAllAppointments");
  }
  const rule = PATH_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
  if (!rule) return true;
  return rule.anyOf.some((p) => can(user, p));
}

export function staffHomePath(
  user: Pick<StaffActor, "role">,
  hasPending = false
): string {
  if (user.role === "admin") return "/admin";
  if (user.role === "responsible") return "/admin/control";
  if (user.role === "leadership") return "/admin/reception";
  if (user.role === "reception" && hasPending) return "/admin/inbox";
  return "/admin";
}
