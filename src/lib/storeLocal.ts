import { addDays, format } from "date-fns";
import type {
  AppealCard,
  Appointment,
  AppointmentStatus,
  AssignmentStatus,
  BookInput,
  CalendarSettings,
  EligibilityTreeNode,
  PlatformState,
  ServiceContent,
  SurveyMeta,
  SurveyQuestion,
} from "./types";
import type { StaffProfile } from "./staff";
import { toStaffProfile } from "./staff";
import { generateId, generatePin, generateUniqueCode } from "./utils";
import {
  allowedManualStatuses,
  appointmentVisibleTo,
  can,
  DENIED,
  type Permission,
} from "./acl";
import { isReceptionDate, generateDaySlots, listAvailableDates } from "./slots";
import { resolveTargetWindow } from "./targets";
import { assignmentStatusLabel } from "./assignment";
import { APPEAL_STAGE_MANUAL_TRANSITIONS } from "./constants";

type Err = { ok: false; error: string };

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
      const code = generateUniqueCode(
        (c) =>
          state.appointments.some((a) => a.code === c) ||
          state.appeals.some((a) => a.code === c)
      );
      const apt: Appointment = {
        id: generateId("apt"),
        code,
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
            body: "Запись вступит в силу после подтверждения приёмной.",
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

    updateAppointmentDetails: async (
      code: string,
      pin: string,
      patch: Partial<
        Pick<Appointment, "fullName" | "phone" | "email" | "topic" | "description">
      >
    ) => {
      const apt = store
        .getState()
        .appointments.find(
          (a) =>
            a.code.toUpperCase() === code.trim().toUpperCase() && a.pin === pin
        );
      if (!apt) return { ok: false as const, error: "Запись не найдена." };
      if (
        ["cancelled", "completed", "accepted", "rejected"].includes(apt.status)
      ) {
        return {
          ok: false as const,
          error: "Сведения по этой записи изменить нельзя.",
        };
      }
      if (apt.status !== "pending_review") {
        return {
          ok: false as const,
          error:
            "Изменение сведений доступно до подтверждения заявки приёмной.",
        };
      }
      const fullName = (patch.fullName ?? apt.fullName).trim();
      const phone = (patch.phone ?? apt.phone).trim();
      const topic = (patch.topic ?? apt.topic).trim();
      if (!fullName || !phone || !topic) {
        return {
          ok: false as const,
          error: "Заполните ФИО, телефон и тему обращения.",
        };
      }
      const nextPatch = {
        fullName,
        phone,
        email: patch.email !== undefined ? patch.email.trim() || undefined : apt.email,
        topic,
        description:
          patch.description !== undefined
            ? patch.description.trim()
            : apt.description,
        history: [
          ...apt.history,
          hist(
            { fullName: "Гражданин" },
            "Изменены сведения",
            "Заявитель обновил данные заявки до подтверждения."
          ),
        ],
      };
      const next = patchApt(store, apt.id, nextPatch);
      const apl = appealOfApt(store, apt.id);
      if (apl && next) {
        patchApl(store, apl.id, {
          fullName: next.fullName,
          phone: next.phone,
          email: next.email,
          topic: next.topic,
          summary: next.description || next.topic,
        });
      }
      return next
        ? { ok: true as const }
        : { ok: false as const, error: "Не удалось сохранить сведения." };
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
      // По ТЗ §5 отдельного статуса «отказ» нет — отказ оформляется как отмена.
      patchApt(store, apt.id, {
        status: "cancelled",
        reviewNote: reason,
        history: [...apt.history, hist(u, "Отменена", reason)],
      });
      const apl = appealOfApt(store, apt.id);
      if (apl) patchApl(store, apl.id, { stage: "cancelled" });
      pushLog(store, u, "Отмена заявки (отказ)", "appointment", apt.id, apt.code);
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
      // Устаревшие статусы вне ТЗ §5 — через форму не выставляем.
      if (status === "rejected" || status === "no_show") return deny();
      if (!allowedManualStatuses(u, apt).includes(status)) return deny();

      const patch: Partial<Appointment> = {
        status,
        history: [...apt.history, hist(u, statusLabel(status), note)],
      };
      // ТЗ §5: при переносе сохранять прежние дату и время.
      if (status === "rescheduled" && !apt.previousDate) {
        patch.previousDate = apt.date;
        patch.previousSlotStart = apt.slotStart;
        patch.previousSlotEnd = apt.slotEnd;
      }
      patchApt(store, apt.id, patch);

      const apl = appealOfApt(store, apt.id);
      if (apl) {
        if (status === "pending_review") {
          patchApl(store, apl.id, { stage: "registered" });
        } else if (status === "cancelled") {
          patchApl(store, apl.id, { stage: "cancelled" });
        }
      }

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
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      if (apl.stage === stage) return { ok: true as const };
      if (!APPEAL_STAGE_MANUAL_TRANSITIONS[apl.stage].includes(stage)) {
        return {
          ok: false as const,
          error:
            "Этот переход недоступен вручную: дальнейший этап выставляется действием (приём, ответ, оценка), а не выбором из списка.",
        };
      }
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
      // Статус поручения — это внутренний прогресс исполнителя, а не этап
      // обращения: "Исполнено" само по себе не означает, что гражданину
      // отправлен ответ. Этап "answered" ставит только submitFinalAnswer —
      // иначе карточка могла закрыться (после оценки гражданина) без единого
      // слова реального ответа.
      patchApl(store, appealId, {
        assignment: { ...apl.assignment, status },
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
      // Первичное поручение создаётся вместе с протоколом приёма
      // (completeReception) — там же выставляется stage "in_control", по
      // которому исполнитель видит карточку в "Поручениях". Это действие —
      // только переназначение уже принятого обращения на другого сотрудника;
      // на "сыром" обращении оно оставляло бы поручение, невидимое
      // исполнителю (этап карточки не сдвигался).
      if (!["in_control", "answered"].includes(apl.stage)) {
        return {
          ok: false as const,
          error:
            "Сначала нужно провести личный приём и зафиксировать протокол — поручение появляется вместе с ним.",
        };
      }
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
      // Протокол исполнения завершает тот, кому поручено (обычно "responsible";
      // "leadership" — только если сам назначил себя через "Исполнить самому",
      // см. проверку владения ниже — то же правило, что и в setAssignmentStatus).
      if (!can(u, "changeAssignmentStatus") && u.role !== "admin") return deny();
      const apl = store.getState().appeals.find((a) => a.id === appealId);
      if (!apl) return { ok: false as const, error: "Карточка не найдена." };
      if (apl.assignment?.responsibleUserId !== u.id && u.role !== "admin") {
        return deny();
      }
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
      const u = requirePerm(store, "editPlatformCalendar");
      if (isErr(u)) return u;
      store.setState((s) => ({ calendar: { ...s.calendar, ...patch } }));
      pushLog(store, u, "Изменение параметров платформы", "schedule");
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
            }
          : p
      );
      store.updateServiceContent({ leadership });
      pushLog(store, u, "Изменение графика приёма", "schedule", targetId);
      return { ok: true as const };
    },

    // График приёма (leadership[].weekdays/startMinutes/endMinutes) сюда не
    // попадает — он меняется только через patchLeadershipSchedule (сотрудник
    // за себя или админ за любого). Здесь — остальной контент CMS.
    updateServiceContent: async (patch: Partial<ServiceContent>) => {
      const u = actor(store);
      if (!u || (!can(u, "editContent") && !can(u, "editStaffList"))) {
        return deny();
      }
      store.updateServiceContent(patch);
      pushLog(
        store,
        u,
        patch.leadership ? "Изменение списка руководства" : "Изменение контента",
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
    // Устаревшие ключи (не в ТЗ §5) — отображаем как отмену
    rejected: "Отменена",
    no_show: "Отменена",
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
