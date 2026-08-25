import { backend } from "@/api/client";
import { ApiError } from "@/api/http";
import type {
  AppealCard,
  Appointment,
  PublicAppointment,
} from "@/api/dto";
import type { StaffProfile } from "./staff";

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

type ResultOk = { ok: true };
type ResultErr = { ok: false; error: string };

function fail(e: unknown): ResultErr {
  if (e instanceof ApiError) return { ok: false, error: e.message };
  return { ok: false, error: "Сервис временно недоступен" };
}

export function withPin(
  apt: PublicAppointment,
  pin = ""
): Appointment {
  return {
    ...apt,
    pin,
    companions: apt.companions ?? [],
    history: apt.history ?? [],
  };
}

/**
 * Часть локального стора, которую тонкий клиент использует как кэш/черновик:
 * оптимистично применяет правку в UI, затем сохраняет её на бэкенде.
 */
type StoreSlice = {
  upsertAppointment: (apt: Appointment) => void;
  upsertAppeal: (apl: AppealCard) => void;
  replaceStaffLists: (payload: {
    appointments?: Appointment[];
    appeals?: AppealCard[];
    staff?: import("./types").StaffUser[];
    calendar?: import("./types").CalendarSettings;
    surveyResponses?: import("./types").SurveyResponse[];
  }) => void;
  updateSurveyMeta: (patch: Partial<import("./types").SurveyMeta>) => void;
  saveSurveyQuestion: (q: import("./types").SurveyQuestion) => void;
  deleteSurveyQuestion: (id: string) => void;
  reorderSurveyQuestion: (id: string, dir: "up" | "down") => void;
  resetSurveyQuestions: () => void;
  updateServiceContent: (
    patch: Partial<import("./types").ServiceContent>
  ) => void;
  setEligibilityTree: (tree: import("./types").EligibilityTreeNode[]) => void;
  patchEligibilityNode: (
    id: string,
    patch: Partial<import("./types").EligibilityTreeNode>
  ) => void;
  removeEligibilityNode: (id: string) => void;
  addEligibilityNode: (
    parentId: string | null,
    node: import("./types").EligibilityTreeNode
  ) => void;
  resetEligibilityTree: () => void;
  calendar: import("./types").CalendarSettings;
  surveyMeta: import("./types").SurveyMeta;
  surveyQuestions: import("./types").SurveyQuestion[];
  eligibilityTree: import("./types").EligibilityTreeNode[];
};

async function refreshLists(store: StoreSlice) {
  const [appointments, appeals] = await Promise.all([
    backend.staff.appointments(),
    backend.staff.appeals(),
  ]);
  store.replaceStaffLists({
    appointments: appointments.map((a) => withPin(a)),
    appeals,
  });
}

async function persistSurvey(getState: () => StoreSlice) {
  const s = getState();
  await backend.staff.putSurvey({
    meta: s.surveyMeta,
    questions: s.surveyQuestions,
  });
}

async function persistEligibility(store: StoreSlice, getState: () => StoreSlice) {
  const nodes = await backend.staff.putEligibility(getState().eligibilityTree);
  store.setEligibilityTree(nodes);
}

let surveyMetaTimer: ReturnType<typeof setTimeout> | undefined;

/** Тонкий клиент к sot-reception-api. Каждое действие — прямой вызов бэкенда. */
export function wrapRemote(
  store: StoreSlice,
  getState: () => StoreSlice = () => store
) {
  return {
    bookAppointment: async (input: BookInput) => {
      try {
        const res = await backend.public.book(input);
        const apt = withPin(res.appointment, res.pin);
        store.upsertAppointment(apt);
        return { ok: true as const, appointment: apt, pin: res.pin };
      } catch (e) {
        return fail(e);
      }
    },

    findAppointment: async (code: string, pin: string) => {
      try {
        const apt = await backend.public.unlock(code, { pin });
        const local = withPin(apt, pin);
        store.upsertAppointment(local);
        return local;
      } catch {
        return null;
      }
    },

    lookupByCode: async (code: string) => {
      try {
        const data = await backend.public.lookup(code);
        const apt = withPin(data.appointment);
        store.upsertAppointment(apt);
        const stub: AppealCard = {
          id: apt.id,
          appointmentId: apt.id,
          code: apt.code,
          stage: data.appealStage || "registered",
          fullName: apt.fullName,
          phone: apt.phone,
          email: apt.email,
          topic: apt.topic,
          region: apt.region,
          locality: apt.locality,
          street: apt.street,
          category: apt.category,
          summary: apt.topic,
          previousAppealIds: [],
          previousNotes: "",
          prepNotes: "",
          createdAt: apt.createdAt,
          updatedAt: apt.updatedAt,
          feedback: data.feedback,
          notifications: data.latestNotification
            ? [
                {
                  id: "n-latest",
                  at: apt.updatedAt,
                  channel: apt.email ? "email" : "system",
                  title: data.latestNotification.title,
                  body: data.latestNotification.body,
                  read: true,
                },
              ]
            : [],
          controlLog: [],
        };
        store.upsertAppeal(stub);
        return { appointment: apt, appeal: stub };
      } catch {
        return null;
      }
    },

    recoverCodesByPhone: async (phone: string) => {
      try {
        const res = await backend.public.recover({ phone });
        return res.codes;
      } catch {
        return [];
      }
    },

    cancelAppointment: async (code: string, pin: string) => {
      try {
        const apt = await backend.public.actions(code, { pin, action: "cancel" });
        store.upsertAppointment(withPin(apt, pin));
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    rescheduleAppointment: async (
      code: string,
      pin: string,
      date: string,
      slotStart: string,
      slotEnd: string
    ) => {
      try {
        const apt = await backend.public.actions(code, {
          pin,
          action: "reschedule",
          date,
          slotStart,
          slotEnd,
        });
        store.upsertAppointment(withPin(apt, pin));
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    submitFeedback: async (
      code: string,
      feedback: Omit<import("./types").Feedback, "submittedAt">
    ) => {
      try {
        await backend.public.feedback(code, feedback);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    confirmAppointmentRequest: async (
      appointmentId: string,
      _user: StaffProfile,
      note?: string
    ) => {
      try {
        await backend.staff.confirm(appointmentId, { note });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    rejectAppointmentRequest: async (
      appointmentId: string,
      _user: StaffProfile,
      reason: string
    ) => {
      try {
        await backend.staff.reject(appointmentId, { reason });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffCancelAppointment: async (
      appointmentId: string,
      _user: StaffProfile,
      reason?: string
    ) => {
      try {
        await backend.staff.cancel(appointmentId, { reason });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffRestoreAppointment: async (
      appointmentId: string,
      _user: StaffProfile
    ) => {
      try {
        await backend.staff.restore(appointmentId);
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffSetAppointmentStatus: async (
      appointmentId: string,
      status: Appointment["status"],
      _user: StaffProfile,
      note?: string
    ) => {
      try {
        await backend.staff.setStatus(appointmentId, { status, note });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffRescheduleAppointment: async (
      appointmentId: string,
      date: string,
      slotStart: string,
      slotEnd: string,
      _user: StaffProfile
    ) => {
      try {
        await backend.staff.reschedule(appointmentId, {
          date,
          slotStart,
          slotEnd,
        });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffUpdateCitizenData: async (
      appointmentId: string,
      patch: Partial<
        Pick<
          Appointment,
          "fullName" | "phone" | "email" | "topic" | "category" | "description"
        >
      >,
      _user: StaffProfile
    ) => {
      try {
        await backend.staff.patchAppointment(appointmentId, patch);
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    staffSetAppealStage: async (
      appealId: string,
      stage: AppealCard["stage"],
      _user: StaffProfile,
      note?: string
    ) => {
      try {
        await backend.staff.setStage(appealId, { stage, note });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    startPrep: async (appealId: string, _user: StaffProfile) => {
      try {
        await backend.staff.setStage(appealId, { stage: "under_review" });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    completePrep: async (
      appealId: string,
      _user: StaffProfile,
      data: {
        summary: string;
        prepNotes: string;
        category: Appointment["category"];
      }
    ) => {
      try {
        await backend.staff.completePrep(appealId, data);
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    completeReception: async (
      appealId: string,
      _user: StaffProfile,
      protocol: Omit<import("./types").ReceptionProtocol, "heldAt" | "heldBy">
    ) => {
      try {
        await backend.staff.completeReception(appealId, protocol);
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    assignAppeal: async (
      appealId: string,
      responsibleUserId: string,
      responsibleName: string,
      text: string
    ) => {
      try {
        await backend.staff.assignAppeal(appealId, {
          responsibleUserId,
          responsibleName,
          text,
        });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    addControlLog: async (
      appealId: string,
      _user: StaffProfile,
      action: string,
      comment: string
    ) => {
      try {
        await backend.staff.addControlLog(appealId, { action, comment });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    setAssignmentStatus: async (
      appealId: string,
      status: "not_assigned" | "assigned" | "in_progress" | "done" | "needs_rework"
    ) => {
      try {
        await backend.staff.setAssignmentStatus(appealId, { status });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    submitFinalAnswer: async (
      appealId: string,
      _user: StaffProfile,
      answer: string
    ) => {
      try {
        await backend.staff.submitAnswer(appealId, { answer });
        await refreshLists(store);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    updateCalendar: async (
      patch: Partial<import("./types").CalendarSettings>
    ) => {
      try {
        const next = { ...getState().calendar, ...patch };
        const saved = await backend.staff.putCalendar(next);
        store.replaceStaffLists({ calendar: saved });
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    patchLeadershipSchedule: async (
      targetId: string,
      patch: { weekdays: number[]; startMinutes: number; endMinutes: number }
    ) => {
      try {
        const content = await backend.staff.patchLeadershipSchedule(targetId, patch);
        store.updateServiceContent({
          leadership: (content as import("./types").ServiceContent).leadership,
        });
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    updateServiceContent: async (
      patch: Partial<import("./types").ServiceContent>
    ) => {
      try {
        await backend.staff.putContent(
          patch as import("./types").ServiceContent
        );
        store.updateServiceContent(patch);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    setEligibilityTree: async (
      tree: import("./types").EligibilityTreeNode[]
    ) => {
      try {
        const nodes = await backend.staff.putEligibility(tree);
        store.setEligibilityTree(nodes);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    patchEligibilityNode: async (
      id: string,
      patch: Partial<import("./types").EligibilityTreeNode>
    ) => {
      store.patchEligibilityNode(id, patch);
      try {
        await persistEligibility(store, getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    removeEligibilityNode: async (id: string) => {
      store.removeEligibilityNode(id);
      try {
        await persistEligibility(store, getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    addEligibilityNode: async (
      parentId: string | null,
      node: import("./types").EligibilityTreeNode
    ) => {
      store.addEligibilityNode(parentId, node);
      try {
        await persistEligibility(store, getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    resetEligibilityTree: async () => {
      store.resetEligibilityTree();
      try {
        await persistEligibility(store, getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    updateSurveyMeta: async (
      patch: Partial<import("./types").SurveyMeta>
    ) => {
      store.updateSurveyMeta(patch);
      if (surveyMetaTimer) clearTimeout(surveyMetaTimer);
      surveyMetaTimer = setTimeout(() => {
        void persistSurvey(getState).catch(() => undefined);
      }, 700);
      return { ok: true as const };
    },

    saveSurveyQuestion: async (q: import("./types").SurveyQuestion) => {
      store.saveSurveyQuestion(q);
      try {
        await persistSurvey(getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    deleteSurveyQuestion: async (id: string) => {
      store.deleteSurveyQuestion(id);
      try {
        await persistSurvey(getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    reorderSurveyQuestion: async (id: string, dir: "up" | "down") => {
      store.reorderSurveyQuestion(id, dir);
      try {
        await persistSurvey(getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    resetSurveyQuestions: async () => {
      store.resetSurveyQuestions();
      try {
        await persistSurvey(getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },

    pushSurvey: async () => {
      try {
        await persistSurvey(getState);
        return { ok: true as const };
      } catch (e) {
        return fail(e);
      }
    },
  };
}
