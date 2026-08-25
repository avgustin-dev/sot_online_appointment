/** Пути относительно NEXT_PUBLIC_API_URL (уже с /api/v1). */
function q(params: Record<string, string | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) usp.set(k, v);
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const paths = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  public: {
    bootstrap: "/public/bootstrap",
    dates: (targetId: string) =>
      `/public/dates${q({ targetId })}`,
    slots: (
      date: string,
      targetId: string,
      excludeAppointmentId?: string
    ) =>
      `/public/slots${q({ date, targetId, excludeAppointmentId })}`,
    book: "/public/appointments",
    lookup: (code: string) =>
      `/public/appointments/${encodeURIComponent(code)}`,
    unlock: (code: string) =>
      `/public/appointments/${encodeURIComponent(code)}/unlock`,
    actions: (code: string) =>
      `/public/appointments/${encodeURIComponent(code)}/actions`,
    feedback: (code: string) =>
      `/public/appointments/${encodeURIComponent(code)}/feedback`,
    recover: "/public/recover-codes",
    survey: "/public/survey",
  },
  staff: {
    appointments: (query?: {
      status?: string;
      date?: string;
      targetId?: string;
    }) => `/staff/appointments${q(query ?? {})}`,
    confirm: (id: string) => `/staff/appointments/${id}/confirm`,
    reject: (id: string) => `/staff/appointments/${id}/reject`,
    cancel: (id: string) => `/staff/appointments/${id}/cancel`,
    restore: (id: string) => `/staff/appointments/${id}/restore`,
    appointment: (id: string) => `/staff/appointments/${id}`,
    status: (id: string) => `/staff/appointments/${id}/status`,
    reschedule: (id: string) => `/staff/appointments/${id}/reschedule`,
    appeals: (stage?: string) =>
      `/staff/appeals${q({ stage })}`,
    appeal: (id: string) => `/staff/appeals/${id}`,
    prep: (id: string) => `/staff/appeals/${id}/prep`,
    ready: (id: string) => `/staff/appeals/${id}/ready`,
    reception: (id: string) => `/staff/appeals/${id}/reception`,
    assign: (id: string) => `/staff/appeals/${id}/assign`,
    control: (id: string) => `/staff/appeals/${id}/control`,
    assignmentStatus: (id: string) =>
      `/staff/appeals/${id}/assignment-status`,
    answer: (id: string) => `/staff/appeals/${id}/answer`,
    stage: (id: string) => `/staff/appeals/${id}/stage`,
    calendar: "/staff/calendar",
    leadershipSchedule: (targetId: string) =>
      `/staff/leadership/${encodeURIComponent(targetId)}/schedule`,
    content: "/staff/content",
    eligibility: "/staff/eligibility",
    survey: "/staff/survey",
    surveyResponses: "/staff/survey/responses",
    analytics: "/staff/analytics",
    users: "/staff/users",
  },
} as const;
