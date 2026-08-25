import { addDays, format } from "date-fns";
import type {
  AppealCard,
  Appointment,
  AppointmentStatus,
  AssignmentStatus,
  CalendarSettings,
  EligibilityTreeNode,
  PlatformState,
  ServiceContent,
  StaffUser,
  SurveyMeta,
  SurveyQuestion,
} from "./types";
import type { StaffProfile } from "./staff";
import { toStaffProfile } from "./staff";
import { generateCode, generateId, generatePin } from "./utils";
import {
  appointmentVisibleTo,
  can,
  DENIED,
  type Permission,
} from "./acl";
import { isReceptionDate, generateDaySlots, listAvailableDates } from "./slots";
import { resolveTargetWindow } from "./targets";
import { assignmentStatusLabel } from "./assignment";

type Ok = { ok: true };
type Err = { ok: false; error: string };
type Result = Ok | Err;

type BookInput = {
  fullName: string;
  phone: string;
  email?: string;
  topic: string;
  region: string;
  locality: string;
  street: string;
  category: Appointment["category"];
  description?: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  targetId: string;
  companions?: { fullName: string; phone?: string }[];
};

export type LocalStoreApi = {
  getState: () => PlatformState;
  setState: (
    partial:
      | Partial<PlatformState>
      | ((s: PlatformState) => Partial<PlatformState>)
  ) => void;
  hydrateStaffSession: (profile: StaffProfile) => void;
  upsertAppointment: (apt: Appointment) => void;
  upsertAppeal: (apl: AppealCard) => void;
  updateSurveyMeta: (patch: Partial<SurveyMeta>) => void;
  saveSurveyQuestion: (q: SurveyQuestion) => void;
  deleteSurveyQuestion: (id: string) => void;
  reorderSurveyQuestion: (id: string, dir: "up" | "down") => void;
  resetSurveyQuestions: () => void;
  updateServiceContent: (patch: Partial<ServiceContent>) => void;
  setEligibilityTree: (tree: EligibilityTreeNode[]) => void;
  patchEligibilityNode: (
    id: string,
    patch: Partial<EligibilityTreeNode>
  ) => void;
  removeEligibilityNode: (id: string) => void;
  addEligibilityNode: (
    parentId: string | null,
    node: EligibilityTreeNode
  ) => void;
  resetEligibilityTree: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function actor(store: LocalStoreApi, user?: StaffProfile | null): StaffProfile | null {
  if (user) return user;
  const s = store.getState();
  const raw = s.staff.find((u) => u.id === s.session?.userId);
  return raw ? toStaffProfile(raw) : null;
}

function deny(): Err {
  return { ok: false, error: DENIED };
}

function isErr(v: StaffProfile | Err): v is Err {
  return "error" in v;
}

function requirePerm(
  store: LocalStoreApi,
  permission: Permission,
  user?: StaffProfile | null
): StaffProfile | Err {
  const u = actor(store, user);
  if (!u || !can(u, permission)) return deny();
  return u;
}

function isBusyStatus(status: AppointmentStatus): boolean {
  return !["cancelled", "rejected"].includes(status);
}

function slotTaken(
  state: PlatformState,
  date: string,
  targetId: string,
  slotStart: string,
  excludeId?: string
): boolean {
  return state.appointments.some(
    (a) =>
      a.id !== excludeId &&
      a.date === date &&
      a.targetId === targetId &&
      a.slotStart === slotStart &&
      isBusyStatus(a.status)
  );
}

function pushLog(
  store: LocalStoreApi,
  user: StaffProfile,
  action: string,
  entity: "appointment" | "schedule" | "assignment" | "content",
  entityId?: string,
  detail?: string
) {
  const entry = {
    id: generateId("log"),
    at: nowIso(),
    userId: user.id,
    userName: user.fullName,
    action,
    entity,
    entityId,
    detail,
  };
  store.setState((s) => ({ actionLog: [entry, ...(s.actionLog ?? [])].slice(0, 400) }));
}

function patchApt(
  store: LocalStoreApi,
  id: string,
  patch: Partial<Appointment>
): Appointment | null {
  const cur = store.getState().appointments.find((a) => a.id === id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: nowIso() };
  store.upsertAppointment(next);
  return next;
}

function patchApl(
  store: LocalStoreApi,
  id: string,
  patch: Partial<AppealCard>
): AppealCard | null {
  const cur = store.getState().appeals.find((a) => a.id === id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: nowIso() };
  store.upsertAppeal(next);
  return next;
}

function appealOfApt(store: LocalStoreApi, appointmentId: string) {
  return store.getState().appeals.find((a) => a.appointmentId === appointmentId);
}

function hist(
  user: StaffProfile | { fullName: string; id?: string },
  action: string,
  detail?: string
) {
  return {
    at: nowIso(),
    action,
    detail,
    staffName: user.fullName,
  };
}

export function wrapLocal(store: LocalStoreApi) {
  return {
    loginStaff: async (loginName: string, password: string) => {
      const user = store
        .getState()
        .staff.find(
          (s) =>
            s.login.toLowerCase() === loginName.trim().toLowerCase() &&
            s.password === password
        );
      if (!user) {
        return { ok: false as const, error: "Неверный логин или пароль." };
      }
      const profile = toStaffProfile(user);
      store.hydrateStaffSession(profile);
      return { ok: true as const, user: profile };
    },

    bookAppointment: async (input: BookInput) => {
      const state = store.getState();
      if (
        !isReceptionDate(
          input.date,
          state.calendar,
          input.targetId,
          state.serviceContent
        )
      ) {
        return { ok: false as const, error: "На эту дату приём не ведётся." };
      }
      if (
        slotTaken(state, input.date, input.targetId, input.slotStart)
      ) {
        return { ok: false as const, error: "Выбранное время уже занято." };
      }
      const createdAt = nowIso();
      const apt: Appointment = {
        id: generateId("apt"),
        code: generateCode(),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        pin: generatePin(),
        topic: input.topic.trim(),
        category: input.category,
        description: input.description?.trim(),
        region: input.region.trim(),
        locality: input.locality.trim(),
        street: input.street.trim(),
        date: input.date,
        slotStart: input.slotStart,
        slotEnd: input.slotEnd,
        status: "pending_review",
        targetId: input.targetId,
        companions: input.companions ?? [],
        createdAt,
        updatedAt: createdAt,
        history: [
          hist({ fullName: "Гражданин" }, "Поступила", "Электронная запись"),
        ],
      };
      const apl: AppealCard = {
        id: generateId("apl"),
        appointmentId: apt.id,
        code: apt.code,
        fullName: apt.fullName,
        phone: apt.phone,
        email: apt.email,
        topic: apt.topic,
        category: apt.category,
        region: apt.region,
        locality: apt.locality,
        street: apt.street,
        summary: apt.description || apt.topic,
        stage: "registered",
        previousAppealIds: [],
        previousNotes: "",
        prepNotes: "",
        controlLog: [],
        notifications: [
          {
            id: generateId("n"),
            at: createdAt,
            channel: "system",
            title: "Заявка поступила",
            body: "Запись вступит в силу после подтверждения справочной.",
            read: false,
          },
        ],
        createdAt,
        updatedAt: createdAt,
      };
      store.upsertAppointment(apt);
      store.upsertAppeal(apl);
      return { ok: true as const, appointment: apt, pin: apt.pin };
    },

    findAppointment: async (code: string, pin: string) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) =>
            a.code.toUpperCase() === code.trim().toUpperCase() && a.pin === pin
        );
      return apt ?? null;
    },

    lookupByCode: async (code: string) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) => a.code.toUpperCase() === code.trim().toUpperCase()
        );
      if (!apt) return null;
      const appeal = appealOfApt(store, apt.id);
      return {
        appointment: apt,
        appeal: appeal ?? {
          id: apt.id,
          appointmentId: apt.id,
          code: apt.code,
          stage: "registered" as const,
          fullName: apt.fullName,
          phone: apt.phone,
          email: apt.email,
          topic: apt.topic,
          category: apt.category,
          region: apt.region,
          locality: apt.locality,
          street: apt.street,
          summary: apt.description || apt.topic,
          previousAppealIds: [],
          previousNotes: "",
          prepNotes: "",
          createdAt: apt.createdAt,
          updatedAt: apt.updatedAt,
          feedback: undefined,
          notifications: [],
          controlLog: [],
        },
      };
    },

    recoverCodesByPhone: async (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      return store
        .getState()
        .appointments.filter(
          (a) => a.phone.replace(/\D/g, "").slice(-9) === digits.slice(-9)
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((a) => a.code);
    },

    cancelAppointment: async (code: string, pin: string) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) =>
            a.code.toUpperCase() === code.trim().toUpperCase() && a.pin === pin
        );
      if (!apt) return { ok: false as const, error: "Запись не найдена." };
      if (["cancelled", "completed"].includes(apt.status)) {
        return { ok: false as const, error: "Запись нельзя отменить." };
      }
      const next = patchApt(store, apt.id, {
        status: "cancelled",
        history: [
          ...apt.history,
          hist({ fullName: "Гражданин" }, "Отменена", "Отмена гражданином"),
        ],
      });
      const apl = appealOfApt(store, apt.id);
      if (apl) patchApl(store, apl.id, { stage: "cancelled" });
      return next
        ? { ok: true as const }
        : { ok: false as const, error: "Не удалось отменить." };
    },

    rescheduleAppointment: async (
      code: string,
      pin: string,
      date: string,
      slotStart: string,
      slotEnd: string
    ) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) =>
            a.code.toUpperCase() === code.trim().toUpperCase() && a.pin === pin
        );
      if (!apt) return { ok: false as const, error: "Запись не найдена." };
      if (slotTaken(store.getState(), date, apt.targetId, slotStart, apt.id)) {
        return { ok: false as const, error: "Выбранное время уже занято." };
      }
      patchApt(store, apt.id, {
        previousDate: apt.date,
        previousSlotStart: apt.slotStart,
        previousSlotEnd: apt.slotEnd,
        date,
        slotStart,
        slotEnd,
        status: "rescheduled",
        history: [
          ...apt.history,
          hist(
            { fullName: "Гражданин" },
            "Перенесена",
            `Прежние дата и время: ${apt.date} ${apt.slotStart}–${apt.slotEnd}`
          ),
        ],
      });
      return { ok: true as const };
    },

    submitFeedback: async (
      code: string,
      feedback: Omit<import("./types").Feedback, "submittedAt">
    ) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) => a.code.toUpperCase() === code.trim().toUpperCase()
        );
      const apl = apt ? appealOfApt(store, apt.id) : undefined;
      if (!apl) return { ok: false as const, error: "Обращение не найдено." };
      patchApl(store, apl.id, {
        feedback: { ...feedback, submittedAt: nowIso() },
        stage: apl.stage === "answered" ? "closed" : apl.stage,
      });
      return { ok: true as const };
    },

    confirmAppointmentRequest: async (
      appointmentId: string,
      user: StaffProfile,
      note?: string
    ) => {
      const u = requirePerm(store, "confirmAppointment", user);
      if (isErr(u)) return u;
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      if (apt.status !== "pending_review") {
        return { ok: false as const, error: "Заявка уже рассмотрена." };
      }
      patchApt(store, apt.id, {
        status: "confirmed",
        reviewNote: note,
        history: [...apt.history, hist(u, "Подтверждена", note)],
      });
      pushLog(store, u, "Подтверждение заявки", "appointment", apt.id, apt.code);
      return { ok: true as const };
    },

    rejectAppointmentRequest: async (
      appointmentId: string,
      user: StaffProfile,
      reason: string
    ) => {
      const u = requirePerm(store, "rejectAppointment", user);
      if (isErr(u)) return u;
      if (!reason.trim()) {
        return { ok: false as const, error: "Укажите причину отказа." };
      }
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      patchApt(store, apt.id, {
        status: "rejected",
        reviewNote: reason,
        history: [...apt.history, hist(u, "Не подтверждена", reason)],
      });
      const apl = appealOfApt(store, apt.id);
      if (apl) patchApl(store, apl.id, { stage: "cancelled" });
      pushLog(store, u, "Отказ в записи", "appointment", apt.id, apt.code);
      return { ok: true as const };
    },

    staffCancelAppointment: async (
      appointmentId: string,
      user: StaffProfile,
      reason?: string
    ) => {
      const u = requirePerm(store, "cancelAppointment", user);
      if (isErr(u)) return u;
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      patchApt(store, apt.id, {
        status: "cancelled",
        history: [...apt.history, hist(u, "Отменена", reason)],
      });
      const apl = appealOfApt(store, apt.id);
      if (apl) patchApl(store, apl.id, { stage: "cancelled" });
      pushLog(store, u, "Отмена заявки", "appointment", apt.id, apt.code);
      return { ok: true as const };
    },

    staffRestoreAppointment: async (
      appointmentId: string,
      user: StaffProfile
    ) => {
      const u = requirePerm(store, "cancelAppointment", user);
      if (isErr(u)) return u;
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      patchApt(store, apt.id, {
        status: "pending_review",
        history: [...apt.history, hist(u, "Возвращена в поступившие")],
      });
      const apl = appealOfApt(store, apt.id);
      if (apl) patchApl(store, apl.id, { stage: "registered" });
      pushLog(store, u, "Возврат заявки", "appointment", apt.id, apt.code);
      return { ok: true as const };
    },

    staffSetAppointmentStatus: async (
      appointmentId: string,
      status: AppointmentStatus,
      user: StaffProfile,
      note?: string
    ) => {
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      const u = actor(store, user);
      if (!u) return deny();
      if (status === "cancelled" && !can(u, "cancelAppointment")) return deny();
      if (status === "confirmed" && !can(u, "confirmAppointment")) return deny();
      if (status === "rejected" && !can(u, "rejectAppointment")) return deny();
      if (status === "pending_review" && !can(u, "confirmAppointment")) return deny();
      if (status === "rescheduled") return deny();
      if (status === "accepted" && u.role !== "admin" && !can(u, "markAccepted")) {
        return deny();
      }
      if (status === "completed" && u.role !== "admin" && !can(u, "markAccepted")) {
        return deny();
      }
      if (status === "no_show" && !can(u, "cancelAppointment") && u.role !== "admin") {
        return deny();
      }
      if (!appointmentVisibleTo(u, apt) && !can(u, "viewAllAppointments")) {
        return deny();
      }
      patchApt(store, apt.id, {
        status,
        history: [...apt.history, hist(u, statusLabel(status), note)],
      });
      pushLog(
        store,
        u,
        `Статус заявки: ${statusLabel(status)}`,
        "appointment",
        apt.id,
        apt.code
      );
      return { ok: true as const };
    },

    staffRescheduleAppointment: async (
      appointmentId: string,
      date: string,
      slotStart: string,
      slotEnd: string,
      user: StaffProfile
    ) => {
      const u = requirePerm(store, "rescheduleAppointment", user);
      if (isErr(u)) return u;
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      if (!appointmentVisibleTo(u, apt) && !can(u, "viewAllAppointments")) {
        return deny();
      }
      if (slotTaken(store.getState(), date, apt.targetId, slotStart, apt.id)) {
        return { ok: false as const, error: "Выбранное время уже занято." };
      }
      const prev = `${apt.date} ${apt.slotStart}–${apt.slotEnd}`;
      patchApt(store, apt.id, {
        previousDate: apt.date,
        previousSlotStart: apt.slotStart,
        previousSlotEnd: apt.slotEnd,
        date,
        slotStart,
        slotEnd,
        status: "rescheduled",
        history: [
          ...apt.history,
          hist(u, "Перенесена", `Прежние дата и время: ${prev}`),
        ],
      });
      pushLog(
        store,
        u,
        "Перенос заявки",
        "appointment",
        apt.id,
        `${apt.code}: ${prev} → ${date} ${slotStart}–${slotEnd}`
      );
      return { ok: true as const };
    },

    staffUpdateCitizenData: async (
      appointmentId: string,
      patch: Partial<
        Pick<
          Appointment,
          | "fullName"
          | "phone"
          | "email"
          | "topic"
          | "category"
          | "description"
        >
      >,
      user: StaffProfile
    ) => {
      const u = requirePerm(store, "editCitizenData", user);
      if (isErr(u)) return u;
      const apt = store.getState().appointments.find((a) => a.id === appointmentId);
      if (!apt) return { ok: false as const, error: "Заявка не найдена." };
      const next = patchApt(store, apt.id, patch);
      const apl = appealOfApt(store, apt.id);
      if (apl && next) {
        patchApl(store, apl.id, {
          fullName: next.fullName,
          phone: next.phone,
          email: next.email,
          topic: next.topic,
          category: next.category,
          summary: next.description || apl.summary,
        });
      }
      pushLog(store, u, "Изменение данных заявителя", "appointment", apt.id, apt.code);
      return { ok: true as const };
    },

    staffSetAppealStage: async (
      appealId: string,
      stage: AppealCard["stage"],
      user: StaffProfile
    ) => {
      const u = requirePerm(store, "prepCard", user);
      if (isErr(u)) return u;
      patchApl(store, appealId, { stage });
      pushLog(store, u, `Этап карточки: ${stage}`, "appointment", appealId);
      return { ok: true as const };
    },

    startPrep: async (appealId: string, user: StaffProfile) => {
      const u = requirePerm(store, "prepCard", user);
      if (isErr(u)) return u;
      patchApl(store, appealId, { stage: "under_review" });
      return { ok: true as const };
    },

    completePrep: async (
      appealId: string,
      user: StaffProfile,
      data: {
        summary: string;
        prepNotes: string;
        category: Appointment["category"];
      }
    ) => {
      const u = requirePerm(store, "prepCard", user);
      if (isErr(u)) return u;
      patchApl(store, appealId, {
        summary: data.summary,
        prepNotes: data.prepNotes,
        category: data.category,
        stage: "ready_for_reception",
        prepCompletedBy: u.fullName,
        prepCompletedAt: nowIso(),
      });
      return { ok: true as const };
    },

    markReadyForReception: async (appealId: string) => {
      const u = requirePerm(store, "prepCard");
      if (isErr(u)) return u;
      patchApl(store, appealId, { stage: "ready_for_reception" });
      return { ok: true as const };
    },

    completeReception: async (
      appealId: string,
      user: StaffProfile,
      protocol: Omit<import("./types").ReceptionProtocol, "heldAt" | "heldBy">
    ) => {
      const u = requirePerm(store, "conductReception", user);
      if (isErr(u)) return u;
      if (!can(u, "assignExecutor")) return deny();
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      const heldAt = nowIso();
      const due = format(addDays(new Date(), 14), "yyyy-MM-dd");
      patchApl(store, appealId, {
        stage: "in_control",
        receptionProtocol: {
          ...protocol,
          heldAt,
          heldBy: u.fullName,
        },
        assignment: {
          text: protocol.assignmentText,
          responsibleUserId: protocol.responsibleUserId,
          responsibleName: protocol.responsibleName,
          dueDate: due,
          status: "assigned",
          createdAt: heldAt,
        },
      });
      const apt = store
        .getState()
        .appointments.find((a) => a.id === apl.appointmentId);
      if (apt) {
        patchApt(store, apt.id, {
          status: "accepted",
          history: [...apt.history, hist(u, "Принята", "Личный приём проведён, поручение назначено")],
        });
      }
      pushLog(
        store,
        u,
        "Назначение поручения",
        "assignment",
        appealId,
        `Исполнитель: ${protocol.responsibleName}`
      );
      return { ok: true as const };
    },

    addControlLog: async (
      appealId: string,
      user: StaffProfile,
      action: string,
      comment: string
    ) => {
      const u = actor(store, user);
      if (!u) return deny();
      if (!can(u, "changeAssignmentStatus") && u.role !== "admin") return deny();
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      if (
        can(u, "changeAssignmentStatus") &&
        !can(u, "viewAllAppointments") &&
        apl.assignment?.responsibleUserId !== u.id
      ) {
        return deny();
      }
      patchApl(store, appealId, {
        controlLog: [
          ...apl.controlLog,
          {
            id: generateId("cl"),
            at: nowIso(),
            authorId: u.id,
            authorName: u.fullName,
            action,
            comment,
          },
        ],
      });
      pushLog(store, u, action, "assignment", appealId, comment);
      return { ok: true as const };
    },

    setAssignmentStatus: async (appealId: string, status: AssignmentStatus) => {
      const u = requirePerm(store, "changeAssignmentStatus");
      if (isErr(u)) return u;
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl?.assignment) {
        return { ok: false as const, error: "Поручение не назначено." };
      }
      if (apl.assignment.responsibleUserId !== u.id && u.role !== "admin") {
        return deny();
      }
      patchApl(store, appealId, {
        assignment: { ...apl.assignment, status },
        stage:
          status === "done"
            ? apl.stage === "in_control"
              ? "answered"
              : apl.stage
            : apl.stage,
      });
      pushLog(
        store,
        u,
        `Статус поручения: ${assignmentStatusLabel(status)}`,
        "assignment",
        appealId
      );
      return { ok: true as const };
    },

    assignExecutor: async (
      appealId: string,
      responsibleUserId: string,
      text: string,
      user: StaffProfile
    ) => {
      const u = requirePerm(store, "assignExecutor", user);
      if (isErr(u)) return u;
      const resp = store.getState().staff.find((s) => s.id === responsibleUserId);
      if (!resp) return { ok: false as const, error: "Сотрудник не найден." };
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      const createdAt = nowIso();
      patchApl(store, appealId, {
        assignment: {
          text: text.trim() || apl.assignment?.text || "",
          responsibleUserId: resp.id,
          responsibleName: resp.fullName,
          dueDate:
            apl.assignment?.dueDate ||
            format(addDays(new Date(), 14), "yyyy-MM-dd"),
          status: "assigned",
          createdAt: apl.assignment?.createdAt || createdAt,
        },
        stage: apl.stage === "registered" ? apl.stage : apl.stage,
      });
      pushLog(
        store,
        u,
        "Назначение поручения",
        "assignment",
        appealId,
        `Исполнитель: ${resp.fullName}`
      );
      return { ok: true as const };
    },

    assignAppeal: async (
      appealId: string,
      responsibleUserId: string,
      _responsibleName: string,
      text: string
    ) => {
      const u = actor(store);
      if (!u) return deny();
      return wrapLocal(store).assignExecutor(appealId, responsibleUserId, text, u);
    },

    submitFinalAnswer: async (
      appealId: string,
      user: StaffProfile,
      answer: string
    ) => {
      const u = actor(store, user);
      if (!u) return deny();
      // Протокол исполнения завершает исполнитель (роль "responsible"), а не
      // тот, кто назначает поручение ("leadership") — права должны совпадать
      // с формой в /admin/control (canAnswer).
      if (!can(u, "changeAssignmentStatus") && u.role !== "admin") return deny();
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      patchApl(store, appealId, {
        finalAnswer: answer,
        finalAnswerAt: nowIso(),
        stage: "answered",
      });
      const apt = store
        .getState()
        .appointments.find((a) => a.id === apl.appointmentId);
      if (apt) {
        patchApt(store, apt.id, {
          status: "completed",
          history: [...apt.history, hist(u, "Завершена")],
        });
      }
      pushLog(store, u, "Ответ гражданину", "assignment", appealId);
      return { ok: true as const };
    },

    updateCalendar: async (patch: Partial<CalendarSettings>) => {
      const u = requirePerm(store, "editAllSchedules");
      if (isErr(u)) {
        const own = requirePerm(store, "editOwnSchedule");
        if (isErr(own)) return own;
        return { ok: false as const, error: DENIED };
      }
      store.setState((s) => ({ calendar: { ...s.calendar, ...patch } }));
      pushLog(store, u, "Изменение общего графика", "schedule");
      return { ok: true as const };
    },

    patchLeadershipSchedule: async (
      targetId: string,
      patch: { weekdays: number[]; startMinutes: number; endMinutes: number }
    ) => {
      const u = actor(store);
      if (!u) return deny();
      if (!can(u, "editAllSchedules") && !(can(u, "editOwnSchedule") && u.targetId === targetId)) {
        return deny();
      }
      const current = store.getState().serviceContent;
      const leadership = current.leadership.map((p) =>
        p.id === targetId
          ? {
              ...p,
              weekdays: patch.weekdays,
              startMinutes: patch.startMinutes,
              endMinutes: patch.endMinutes,
              windowKind: "fixed" as const,
            }
          : p
      );
      store.updateServiceContent({ leadership });
      pushLog(store, u, "Изменение графика приёма", "schedule", targetId);
      return { ok: true as const };
    },

    updateServiceContent: async (patch: Partial<ServiceContent>) => {
      const u = actor(store);
      if (!u) return deny();
      const onlyOwn =
        !can(u, "editContent") &&
        !can(u, "editStaffList") &&
        can(u, "editOwnSchedule");
      if (!can(u, "editContent") && !can(u, "editStaffList") && !onlyOwn) {
        return deny();
      }
      if (onlyOwn) {
        const mine = u.targetId;
        const current = store.getState().serviceContent;
        const nextPeople = (patch.leadership ?? current.leadership).map((p) => {
          if (p.id !== mine) {
            return current.leadership.find((x) => x.id === p.id) ?? p;
          }
          return p;
        });
        store.updateServiceContent({ leadership: nextPeople });
        pushLog(store, u, "Изменение собственного графика", "schedule", mine);
        return { ok: true as const };
      }
      store.updateServiceContent(patch);
      pushLog(
        store,
        u,
        patch.leadership ? "Изменение списка / графика приёма" : "Изменение контента",
        patch.leadership ? "schedule" : "content"
      );
      return { ok: true as const };
    },

    setEligibilityTree: async (tree: EligibilityTreeNode[]) => {
      const u = requirePerm(store, "editEligibility");
      if (isErr(u)) return u;
      store.setEligibilityTree(tree);
      pushLog(store, u, "Изменение дерева допуска", "content");
      return { ok: true as const };
    },

    patchEligibilityNode: async (
      id: string,
      patch: Partial<EligibilityTreeNode>
    ) => {
      const u = requirePerm(store, "editEligibility");
      if (isErr(u)) return u;
      store.patchEligibilityNode(id, patch);
      return { ok: true as const };
    },

    removeEligibilityNode: async (id: string) => {
      const u = requirePerm(store, "editEligibility");
      if (isErr(u)) return u;
      store.removeEligibilityNode(id);
      return { ok: true as const };
    },

    addEligibilityNode: async (
      parentId: string | null,
      node: EligibilityTreeNode
    ) => {
      const u = requirePerm(store, "editEligibility");
      if (isErr(u)) return u;
      store.addEligibilityNode(parentId, node);
      return { ok: true as const };
    },

    resetEligibilityTree: async () => {
      const u = requirePerm(store, "editEligibility");
      if (isErr(u)) return u;
      store.resetEligibilityTree();
      return { ok: true as const };
    },

    updateSurveyMeta: async (patch: Partial<SurveyMeta>) => {
      const u = requirePerm(store, "editContent");
      if (isErr(u)) return u;
      store.updateSurveyMeta(patch);
      return { ok: true as const };
    },

    saveSurveyQuestion: async (q: SurveyQuestion) => {
      const u = requirePerm(store, "editContent");
      if (isErr(u)) return u;
      store.saveSurveyQuestion(q);
      return { ok: true as const };
    },

    deleteSurveyQuestion: async (id: string) => {
      const u = requirePerm(store, "editContent");
      if (isErr(u)) return u;
      store.deleteSurveyQuestion(id);
      return { ok: true as const };
    },

    reorderSurveyQuestion: async (id: string, dir: "up" | "down") => {
      const u = requirePerm(store, "editContent");
      if (isErr(u)) return u;
      store.reorderSurveyQuestion(id, dir);
      return { ok: true as const };
    },

    resetSurveyQuestions: async () => {
      const u = requirePerm(store, "editContent");
      if (isErr(u)) return u;
      store.resetSurveyQuestions();
      return { ok: true as const };
    },

    pushSurvey: async () => ({ ok: true as const }),
  };
}

function statusLabel(status: AppointmentStatus): string {
  const map: Record<AppointmentStatus, string> = {
    pending_review: "Поступила",
    confirmed: "Подтверждена",
    accepted: "Принята",
    rescheduled: "Перенесена",
    cancelled: "Отменена",
    completed: "Завершена",
    rejected: "Не подтверждена",
    no_show: "Неявка",
  };
  return map[status] ?? status;
}

export function listLocalDates(
  state: PlatformState,
  targetId: string
): string[] {
  return listAvailableDates(
    state.calendar,
    new Date(),
    targetId,
    state.serviceContent
  );
}

export function listLocalSlots(
  state: PlatformState,
  date: string,
  targetId: string,
  excludeAppointmentId?: string
) {
  if (!isReceptionDate(date, state.calendar, targetId, state.serviceContent)) {
    return [];
  }
  const win = resolveTargetWindow(targetId, state.calendar, state.serviceContent);
  const slots = generateDaySlots(state.calendar, {
    startMinutes: win.startMinutes,
    endMinutes: win.endMinutes,
  });
  return slots.filter(
    (s) => !slotTaken(state, date, targetId, s.start, excludeAppointmentId)
  );
}
