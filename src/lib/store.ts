"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SEED_SURVEY_META, SEED_SURVEY_QUESTIONS } from "./surveySeed";
import { mergeServiceContent } from "./serviceContent";
import {
  addEligibilityChild,
  cloneEligibilityTree,
  deleteEligibilityNode,
  updateEligibilityNode,
  type EligibilityNode,
} from "./eligibility";
import type {
  AppealCard,
  Appointment,
  CalendarSettings,
  PlatformState,
  StaffUser,
  SurveyMeta,
  SurveyQuestion,
  SurveyResponse,
  ServiceContent,
  AdminModule,
  EligibilityTreeNode,
} from "./types";
import { matchCitizen } from "./utils";
import { toStaffProfile, type StaffProfile } from "./staff";
import { clearAccessToken, getAccessToken } from "@/api/session";
import { backend } from "@/api/client";
import { useRemoteApi } from "@/config/env";
import { wrapRemote, withPin } from "./storeRemote";
import { wrapLocal } from "./storeLocal";
import { buildSeedState, defaultCalendar, ensureSeedStaff } from "./seed";

export const STORAGE_KEY = "vs-kr-citizen-platform-v15";
const STATE_VERSION = 16;

function seedEligibilityTree(): EligibilityTreeNode[] {
  return cloneEligibilityTree() as EligibilityTreeNode[];
}

const FALLBACK_ELIGIBILITY = seedEligibilityTree();

/** Стартовое значение графика приёма — до первого ответа /public/bootstrap. */
const DEFAULT_CALENDAR: CalendarSettings = defaultCalendar();

/**
 * Клиентский кэш поверх API бэкенда. Здесь нет бизнес-логики (проверок доступности
 * слотов, переходов статусов и т.п.) — только: (1) кэш последних данных с бэкенда,
 * (2) черновики CMS-форм (сайт/допуск/опросник/календарь) для оптимистичного UI перед
 * сохранением через storeRemote.ts, (3) сессия. Источник истины — sot-reception-api.
 */
type PlatformStore = PlatformState & {
  hydrateStaffSession: (profile: StaffProfile) => void;
  logout: () => void;
  getAppealByCode: (code: string) => AppealCard | undefined;
  getPreviousAppeals: (appeal: AppealCard) => AppealCard[];
  getCurrentUser: () => StaffUser | null;
  updateSurveyMeta: (patch: Partial<SurveyMeta>) => void;
  saveSurveyQuestion: (q: SurveyQuestion) => void;
  deleteSurveyQuestion: (id: string) => void;
  reorderSurveyQuestion: (id: string, direction: "up" | "down") => void;
  resetSurveyQuestions: () => void;
  updateServiceContent: (patch: Partial<ServiceContent>) => void;
  setAdminModule: (m: AdminModule) => void;
  resetServiceContent: () => void;
  setEligibilityTree: (tree: EligibilityTreeNode[]) => void;
  patchEligibilityNode: (id: string, patch: Partial<EligibilityNode>) => void;
  removeEligibilityNode: (id: string) => void;
  addEligibilityNode: (
    parentId: string | null,
    node: EligibilityTreeNode
  ) => void;
  resetEligibilityTree: () => void;
  upsertAppointment: (apt: Appointment) => void;
  upsertAppeal: (apl: AppealCard) => void;
  applyBootstrap: (payload: {
    site: ServiceContent;
    eligibilityTree: EligibilityTreeNode[];
    calendar: CalendarSettings;
    survey: { meta: SurveyMeta; questions: SurveyQuestion[] };
  }) => void;
  replaceStaffLists: (payload: {
    appointments?: Appointment[];
    appeals?: AppealCard[];
    staff?: StaffUser[];
    calendar?: CalendarSettings;
    surveyResponses?: SurveyResponse[];
  }) => void;
};

function initialData(): PlatformState {
  if (!useRemoteApi) {
    return { ...buildSeedState(), version: STATE_VERSION };
  }
  return {
    version: STATE_VERSION,
    calendar: DEFAULT_CALENDAR,
    staff: [],
    appointments: [],
    appeals: [],
    session: null,
    surveyMeta: { ...SEED_SURVEY_META },
    surveyQuestions: SEED_SURVEY_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    surveyResponses: [],
    serviceContent: mergeServiceContent(),
    adminModule: "reception",
    eligibilityTree: seedEligibilityTree(),
  };
}

export const usePlatformStore = create<PlatformStore>()(
  persist(
    (set, get) => ({
      ...initialData(),

      getCurrentUser: () => {
        const { session, staff } = get();
        if (!session) return null;
        return staff.find((s) => s.id === session.userId) ?? null;
      },

      hydrateStaffSession: (profile) => {
        set((s) => {
          const existing = s.staff.find((u) => u.id === profile.id);
          const others = s.staff.filter((u) => u.id !== profile.id);
          return {
            // Пароль сохраняем из уже существующей записи — иначе каждый
            // вход стирал бы пароль и следующий логин отказывал бы в доступе.
            staff: [
              ...others,
              { ...profile, password: existing?.password ?? "" },
            ],
            session: { userId: profile.id },
          };
        });
      },

      logout: () => {
        clearAccessToken();
        set({ session: null });
      },

      getAppealByCode: (code) =>
        get().appeals.find(
          (a) => a.code.toUpperCase() === code.trim().toUpperCase()
        ),

      getPreviousAppeals: (appeal) =>
        get()
          .appeals.filter((a) => a.id !== appeal.id && matchCitizen(a, appeal))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

      updateSurveyMeta: (patch) => {
        set((s) => ({ surveyMeta: { ...s.surveyMeta, ...patch } }));
      },

      saveSurveyQuestion: (q) => {
        set((s) => {
          const exists = s.surveyQuestions.some((x) => x.id === q.id);
          const list = exists
            ? s.surveyQuestions.map((x) => (x.id === q.id ? q : x))
            : [...s.surveyQuestions, q];
          list.sort((a, b) => a.order - b.order);
          return { surveyQuestions: list };
        });
      },

      deleteSurveyQuestion: (id) => {
        set((s) => ({
          surveyQuestions: s.surveyQuestions
            .filter((q) => q.id !== id)
            .map((q, i) => ({ ...q, order: i + 1 })),
        }));
      },

      reorderSurveyQuestion: (id, direction) => {
        set((s) => {
          const list = [...s.surveyQuestions].sort(
            (a, b) => a.order - b.order
          );
          const idx = list.findIndex((q) => q.id === id);
          if (idx < 0) return {};
          const j = direction === "up" ? idx - 1 : idx + 1;
          if (j < 0 || j >= list.length) return {};
          const tmp = list[idx];
          list[idx] = list[j];
          list[j] = tmp;
          return {
            surveyQuestions: list.map((q, i) => ({ ...q, order: i + 1 })),
          };
        });
      },

      resetSurveyQuestions: () => {
        set({
          surveyMeta: { ...SEED_SURVEY_META },
          surveyQuestions: SEED_SURVEY_QUESTIONS.map((q) => ({
            ...q,
            options: q.options.map((o) => ({ ...o })),
          })),
        });
      },

      updateServiceContent: (patch) => {
        set((s) => ({
          serviceContent: mergeServiceContent({
            ...(s.serviceContent ?? {}),
            ...patch,
          }),
        }));
      },

      setAdminModule: (m) =>
        set((s) => (s.adminModule === m ? s : { adminModule: m })),

      resetServiceContent: () => {
        set({ serviceContent: mergeServiceContent() });
      },

      setEligibilityTree: (tree) => {
        set({ eligibilityTree: tree });
      },

      patchEligibilityNode: (id, patch) => {
        set((s) => ({
          eligibilityTree: updateEligibilityNode(
            (s.eligibilityTree?.length
              ? s.eligibilityTree
              : seedEligibilityTree()) as EligibilityNode[],
            id,
            patch
          ) as EligibilityTreeNode[],
        }));
      },

      removeEligibilityNode: (id) => {
        set((s) => ({
          eligibilityTree: deleteEligibilityNode(
            (s.eligibilityTree?.length
              ? s.eligibilityTree
              : seedEligibilityTree()) as EligibilityNode[],
            id
          ) as EligibilityTreeNode[],
        }));
      },

      addEligibilityNode: (parentId, node) => {
        set((s) => ({
          eligibilityTree: addEligibilityChild(
            (s.eligibilityTree?.length
              ? s.eligibilityTree
              : seedEligibilityTree()) as EligibilityNode[],
            parentId,
            node as EligibilityNode
          ) as EligibilityTreeNode[],
        }));
      },

      resetEligibilityTree: () => {
        set({ eligibilityTree: seedEligibilityTree() });
      },

      upsertAppointment: (apt) =>
        set((s) => ({
          appointments: s.appointments.some(
            (a) => a.id === apt.id || a.code === apt.code
          )
            ? s.appointments.map((a) =>
                a.id === apt.id || a.code === apt.code ? { ...a, ...apt } : a
              )
            : [...s.appointments, apt],
        })),

      upsertAppeal: (apl) =>
        set((s) => ({
          appeals: s.appeals.some(
            (a) => a.id === apl.id || a.code === apl.code
          )
            ? s.appeals.map((a) =>
                a.id === apl.id || a.code === apl.code ? { ...a, ...apl } : a
              )
            : [...s.appeals, apl],
        })),

      applyBootstrap: (payload) =>
        set({
          serviceContent: mergeServiceContent(payload.site),
          eligibilityTree: payload.eligibilityTree,
          calendar: payload.calendar,
          surveyMeta: payload.survey.meta,
          surveyQuestions: payload.survey.questions,
        }),

      replaceStaffLists: (payload) =>
        set((s) => ({
          appointments: payload.appointments ?? s.appointments,
          appeals: payload.appeals ?? s.appeals,
          staff: payload.staff ?? s.staff,
          calendar: payload.calendar ?? s.calendar,
          surveyResponses: payload.surveyResponses ?? s.surveyResponses,
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      version: STATE_VERSION,
      skipHydration: false,
      partialize: (s) => {
        if (useRemoteApi) {
          return {
            version: s.version,
            session: s.session,
            adminModule: s.adminModule,
          };
        }
        return {
          version: s.version,
          calendar: s.calendar,
          staff: s.staff,
          appointments: s.appointments,
          appeals: s.appeals,
          session: s.session,
          surveyMeta: s.surveyMeta,
          surveyQuestions: s.surveyQuestions,
          surveyResponses: s.surveyResponses,
          serviceContent: s.serviceContent,
          adminModule: s.adminModule,
          eligibilityTree: s.eligibilityTree,
          actionLog: s.actionLog,
        };
      },
      migrate: (persisted, fromVersion) => {
        const p = persisted as Partial<PlatformState>;
        if (useRemoteApi) {
          return {
            ...initialData(),
            session: p.session ?? null,
            adminModule: p.adminModule ?? "reception",
          } as PlatformState;
        }
        const seed = initialData();
        const staff = p.staff?.length ? ensureSeedStaff(p.staff) : seed.staff;
        // v16: убрать учебные заявки из localStorage, штат и CMS не трогать
        const dropSeededRecords = fromVersion < 16;
        return {
          ...seed,
          ...p,
          version: STATE_VERSION,
          staff,
          appointments: dropSeededRecords
            ? []
            : (p.appointments ?? seed.appointments),
          appeals: dropSeededRecords ? [] : (p.appeals ?? seed.appeals),
          actionLog: dropSeededRecords
            ? []
            : (p.actionLog ?? seed.actionLog),
          calendar: p.calendar ?? seed.calendar,
          serviceContent: p.serviceContent ?? seed.serviceContent,
        } as PlatformState;
      },
    }
  )
);

/**
 * Совместимый API: { ready, state, currentUser, actions }.
 * ready = true только на клиенте после mount/rehydrate (без вызова persist на SSR).
 */
export function useStore() {
  const store = usePlatformStore();
  const [ready, setReady] = useState(false);
  const remote = wrapRemote(
    store as never,
    () => usePlatformStore.getState() as never
  );
  const local = wrapLocal({
    getState: () => usePlatformStore.getState(),
    setState: (partial) => usePlatformStore.setState(partial as never),
    hydrateStaffSession: store.hydrateStaffSession,
    upsertAppointment: store.upsertAppointment,
    upsertAppeal: store.upsertAppeal,
    updateSurveyMeta: store.updateSurveyMeta,
    saveSurveyQuestion: store.saveSurveyQuestion,
    deleteSurveyQuestion: store.deleteSurveyQuestion,
    reorderSurveyQuestion: store.reorderSurveyQuestion,
    resetSurveyQuestions: store.resetSurveyQuestions,
    updateServiceContent: store.updateServiceContent,
    setEligibilityTree: store.setEligibilityTree,
    patchEligibilityNode: store.patchEligibilityNode,
    removeEligibilityNode: store.removeEligibilityNode,
    addEligibilityNode: store.addEligibilityNode,
    resetEligibilityTree: store.resetEligibilityTree,
  });
  const api = useRemoteApi ? remote : local;

  useEffect(() => {
    const persistApi = usePlatformStore.persist;
    if (!persistApi) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- гидратация Zustand доступна только на клиенте
      setReady(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setReady(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => setReady(true));
    const t = window.setTimeout(() => setReady(true), 50);
    return () => {
      unsub?.();
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!ready || useRemoteApi) return;
    const s = usePlatformStore.getState();
    if (!s.staff?.length) {
      const seed = buildSeedState();
      usePlatformStore.setState({
        ...seed,
        version: STATE_VERSION,
        session: s.session,
        adminModule: s.adminModule ?? "reception",
      });
      return;
    }
    const staff = ensureSeedStaff(s.staff);
    if (staff !== s.staff) {
      usePlatformStore.setState({ staff });
    }
  }, [ready]);

  useEffect(() => {
    if (!ready || !useRemoteApi) return;
    let cancelled = false;
    (async () => {
      const s = usePlatformStore.getState();
      try {
        const boot = await backend.public.bootstrap();
        if (!cancelled) s.applyBootstrap(boot);
      } catch {
        /* каталог content/ остаётся источником, пока бэкенд недоступен */
      }
      const token = getAccessToken();
      if (!token || cancelled) return;
      try {
        const me = await backend.auth.me();
        if (cancelled) return;
        s.hydrateStaffSession(me);
        const [apts, appeals, users, cal, surveyRes] = await Promise.all([
          backend.staff.appointments(),
          backend.staff.appeals(),
          backend.staff.users(),
          backend.staff.getCalendar(),
          backend.staff.surveyResponses().catch(() => [] as never),
        ]);
        if (cancelled) return;
        s.replaceStaffLists({
          appointments: apts.map((a) => withPin(a)),
          appeals,
          staff: users.map((u) => ({ ...u, password: "" })),
          calendar: cal,
          surveyResponses: surveyRes,
        });
      } catch {
        s.logout();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const currentUser = store.session
    ? (() => {
        const raw = store.staff.find((s) => s.id === store.session?.userId);
        return raw ? toStaffProfile(raw) : null;
      })()
    : null;

  const serviceContent = useMemo(
    () => mergeServiceContent(store.serviceContent),
    [store.serviceContent]
  );

  return {
    ready,
    state: {
      version: store.version,
      calendar: store.calendar,
      staff: store.staff,
      appointments: store.appointments,
      appeals: store.appeals,
      session: store.session,
      surveyMeta: store.surveyMeta ?? SEED_SURVEY_META,
      surveyQuestions: store.surveyQuestions?.length
        ? store.surveyQuestions
        : SEED_SURVEY_QUESTIONS,
      surveyResponses: store.surveyResponses ?? [],
      serviceContent,
      adminModule: store.adminModule ?? "reception",
      eligibilityTree: store.eligibilityTree?.length
        ? store.eligibilityTree
        : FALLBACK_ELIGIBILITY,
      actionLog: store.actionLog ?? [],
    } satisfies PlatformState,
    currentUser,
    hydrateStaffSession: store.hydrateStaffSession,
    logout: store.logout,
    loginStaff: local.loginStaff,
    updateCalendar: api.updateCalendar,
    bookAppointment: api.bookAppointment,
    confirmAppointmentRequest: api.confirmAppointmentRequest,
    rejectAppointmentRequest: api.rejectAppointmentRequest,
    findAppointment: api.findAppointment,
    lookupByCode: api.lookupByCode,
    recoverCodesByPhone: api.recoverCodesByPhone,
    cancelAppointment: api.cancelAppointment,
    rescheduleAppointment: api.rescheduleAppointment,
    updateAppointmentDetails: api.updateAppointmentDetails,
    staffCancelAppointment: api.staffCancelAppointment,
    staffRestoreAppointment: api.staffRestoreAppointment,
    staffSetAppointmentStatus: api.staffSetAppointmentStatus,
    staffRescheduleAppointment: api.staffRescheduleAppointment,
    staffUpdateCitizenData: api.staffUpdateCitizenData,
    staffSetAppealStage: api.staffSetAppealStage,
    startPrep: api.startPrep,
    completePrep: api.completePrep,
    completeReception: api.completeReception,
    assignAppeal: api.assignAppeal,
    addControlLog: api.addControlLog,
    setAssignmentStatus: api.setAssignmentStatus,
    submitFinalAnswer: api.submitFinalAnswer,
    submitFeedback: api.submitFeedback,
    getAppealByCode: store.getAppealByCode,
    getPreviousAppeals: store.getPreviousAppeals,
    updateSurveyMeta: api.updateSurveyMeta,
    saveSurveyQuestion: api.saveSurveyQuestion,
    deleteSurveyQuestion: api.deleteSurveyQuestion,
    reorderSurveyQuestion: api.reorderSurveyQuestion,
    resetSurveyQuestions: api.resetSurveyQuestions,
    pushSurvey: api.pushSurvey,
    updateServiceContent: api.updateServiceContent,
    patchLeadershipSchedule: api.patchLeadershipSchedule,
    setAdminModule: store.setAdminModule,
    resetServiceContent: store.resetServiceContent,
    setEligibilityTree: api.setEligibilityTree,
    patchEligibilityNode: api.patchEligibilityNode,
    removeEligibilityNode: api.removeEligibilityNode,
    addEligibilityNode: api.addEligibilityNode,
    resetEligibilityTree: api.resetEligibilityTree,
  };
}
