import { api } from "./http";
import { paths } from "./paths";
import type {
  AddControlLogRequest,
  AnalyticsResponse,
  AppealCard,
  AppealListQuery,
  Appointment,
  AppointmentListQuery,
  AssignExecutorRequest,
  AvailableDatesResponse,
  BookAppointmentRequest,
  BookAppointmentResponse,
  CalendarSettings,
  CancelAppointmentRequest,
  CitizenAppointmentActionRequest,
  CompletePrepRequest,
  CompleteReceptionRequest,
  ConfirmAppointmentRequest,
  EligibilityTreeNode,
  FeedbackRequest,
  LeadershipScheduleRequest,
  LoginRequest,
  LoginResponse,
  PatchAppointmentRequest,
  PublicAppointment,
  PublicAppointmentLookup,
  PublicBootstrap,
  RecoverCodesRequest,
  RecoverCodesResponse,
  RejectAppointmentRequest,
  RescheduleAppointmentRequest,
  ServiceContent,
  SetAppealStageRequest,
  SetAppointmentStatusRequest,
  SetAssignmentStatusRequest,
  SlotDayResponse,
  StaffProfile,
  SubmitFinalAnswerRequest,
  SubmitSurveyRequest,
  EligibilityTreePayload,
  SurveyAdminBundle,
  SurveyResponse,
  UnlockAppointmentRequest,
} from "./dto";

/** Клиент контракта. Подключается, когда задан NEXT_PUBLIC_API_URL. */
export const backend = {
  auth: {
    login: (body: LoginRequest) =>
      api<LoginResponse>(paths.auth.login, { method: "POST", json: body }),
    logout: () => api<void>(paths.auth.logout, { method: "POST" }),
    me: () => api<StaffProfile>(paths.auth.me),
  },

  public: {
    bootstrap: () => api<PublicBootstrap>(paths.public.bootstrap),
    dates: (targetId: string) =>
      api<AvailableDatesResponse>(paths.public.dates(targetId)),
    slots: (
      date: string,
      targetId: string,
      excludeAppointmentId?: string
    ) =>
      api<SlotDayResponse>(
        paths.public.slots(date, targetId, excludeAppointmentId)
      ),
    book: (body: BookAppointmentRequest) =>
      api<BookAppointmentResponse>(paths.public.book, {
        method: "POST",
        json: body,
      }),
    lookup: (code: string) =>
      api<PublicAppointmentLookup>(paths.public.lookup(code)),
    unlock: (code: string, body: UnlockAppointmentRequest) =>
      api<PublicAppointment>(paths.public.unlock(code), {
        method: "POST",
        json: body,
      }),
    actions: (code: string, body: CitizenAppointmentActionRequest) =>
      api<PublicAppointment>(paths.public.actions(code), {
        method: "POST",
        json: body,
      }),
    feedback: (code: string, body: FeedbackRequest) =>
      api<void>(paths.public.feedback(code), { method: "POST", json: body }),
    recover: (body: RecoverCodesRequest) =>
      api<RecoverCodesResponse>(paths.public.recover, {
        method: "POST",
        json: body,
      }),
    surveyForm: () => api<SurveyAdminBundle>(paths.public.survey),
    submitSurvey: (body: SubmitSurveyRequest) =>
      api<void>(paths.public.survey, { method: "POST", json: body }),
  },

  staff: {
    appointments: (query?: AppointmentListQuery) =>
      api<Appointment[]>(paths.staff.appointments(query)),
    confirm: (id: string, body: ConfirmAppointmentRequest = {}) =>
      api<Appointment>(paths.staff.confirm(id), { method: "POST", json: body }),
    reject: (id: string, body: RejectAppointmentRequest) =>
      api<Appointment>(paths.staff.reject(id), { method: "POST", json: body }),
    cancel: (id: string, body: CancelAppointmentRequest = {}) =>
      api<Appointment>(paths.staff.cancel(id), { method: "POST", json: body }),
    restore: (id: string) =>
      api<Appointment>(paths.staff.restore(id), { method: "POST" }),
    patchAppointment: (id: string, body: PatchAppointmentRequest) =>
      api<Appointment>(paths.staff.appointment(id), {
        method: "PATCH",
        json: body,
      }),
    setStatus: (id: string, body: SetAppointmentStatusRequest) =>
      api<Appointment>(paths.staff.status(id), { method: "POST", json: body }),
    reschedule: (id: string, body: RescheduleAppointmentRequest) =>
      api<Appointment>(paths.staff.reschedule(id), {
        method: "POST",
        json: body,
      }),
    appeals: (query?: AppealListQuery) =>
      api<AppealCard[]>(paths.staff.appeals(query?.stage)),
    appeal: (id: string) => api<AppealCard>(paths.staff.appeal(id)),
    completePrep: (id: string, body: CompletePrepRequest) =>
      api<AppealCard>(paths.staff.prep(id), { method: "POST", json: body }),
    markReady: (id: string) =>
      api<AppealCard>(paths.staff.ready(id), { method: "POST" }),
    completeReception: (id: string, body: CompleteReceptionRequest) =>
      api<AppealCard>(paths.staff.reception(id), {
        method: "POST",
        json: body,
      }),
    assignAppeal: (id: string, body: AssignExecutorRequest) =>
      api<AppealCard>(paths.staff.assign(id), { method: "POST", json: body }),
    addControlLog: (id: string, body: AddControlLogRequest) =>
      api<AppealCard>(paths.staff.control(id), { method: "POST", json: body }),
    setAssignmentStatus: (id: string, body: SetAssignmentStatusRequest) =>
      api<AppealCard>(paths.staff.assignmentStatus(id), {
        method: "POST",
        json: body,
      }),
    submitAnswer: (id: string, body: SubmitFinalAnswerRequest) =>
      api<AppealCard>(paths.staff.answer(id), { method: "POST", json: body }),
    setStage: (id: string, body: SetAppealStageRequest) =>
      api<AppealCard>(paths.staff.stage(id), { method: "POST", json: body }),
    getCalendar: () => api<CalendarSettings>(paths.staff.calendar),
    putCalendar: (body: CalendarSettings) =>
      api<CalendarSettings>(paths.staff.calendar, { method: "PUT", json: body }),
    getContent: () => api<ServiceContent>(paths.staff.content),
    putContent: (body: ServiceContent) =>
      api<ServiceContent>(paths.staff.content, { method: "PUT", json: body }),
    patchLeadershipSchedule: (targetId: string, body: LeadershipScheduleRequest) =>
      api<ServiceContent>(paths.staff.leadershipSchedule(targetId), {
        method: "PATCH",
        json: body,
      }),
    getEligibility: () =>
      api<EligibilityTreePayload>(paths.staff.eligibility).then((r) => r.nodes),
    putEligibility: (body: EligibilityTreeNode[]) =>
      api<EligibilityTreePayload>(paths.staff.eligibility, {
        method: "PUT",
        json: { nodes: body },
      }).then((r) => r.nodes),
    getSurvey: () => api<SurveyAdminBundle>(paths.staff.survey),
    putSurvey: (body: SurveyAdminBundle) =>
      api<SurveyAdminBundle>(paths.staff.survey, { method: "PUT", json: body }),
    surveyResponses: () =>
      api<SurveyResponse[]>(paths.staff.surveyResponses),
    analytics: () => api<AnalyticsResponse>(paths.staff.analytics),
    users: () => api<StaffProfile[]>(paths.staff.users),
  },
};
