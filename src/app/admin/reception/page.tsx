"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { StageBadge } from "@/components/ui/Badge";
import { formatDateRu } from "@/lib/slots";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { ReceptionTabs } from "@/components/staff/ReceptionTabs";
import { Modal } from "@/components/ui/Modal";
import { Search, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { targetShort } from "@/lib/targets";
import { ReportPanel } from "@/components/staff/ReportPanel";
import {
  allPeriod,
  filterByPeriod,
  type ReportPeriod,
} from "@/lib/reportPeriods";

export default function ReceptionPage() {
  const { state, currentUser, completeReception } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const [selectedId, setSelectedId] = useState<string>("");
  const [leadershipExplanation, setLeadershipExplanation] = useState("");
  const [assignmentText, setAssignmentText] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [specialistsInvolved, setSpecialistsInvolved] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>(() => allPeriod());

  const isDeputyView = currentUser?.role === "responsible";

  const queue = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const inPeriodIds = new Set(
      filterByPeriod(state.appointments, period).map((a) => a.id)
    );
    return state.appeals
      .filter((a) =>
        ["ready_for_reception", "under_review", "registered"].includes(a.stage)
      )
      .map((a) => ({
        appeal: a,
        apt: state.appointments.find((x) => x.id === a.appointmentId),
      }))
      .filter(
        (x) =>
          x.apt &&
          inPeriodIds.has(x.apt.id) &&
          x.apt.status !== "cancelled" &&
          x.apt.status !== "rejected" &&
          x.apt.status !== "pending_review" &&
          (!isDeputyView || x.apt.targetId === currentUser?.targetId)
      )
      .filter(({ appeal, apt }) => {
        if (!needle) return true;
        const target = apt
          ? targetShort(apt.targetId, isKy, state.serviceContent)
          : "";
        const hay = [
          appeal.fullName,
          appeal.topic,
          appeal.phone,
          appeal.code,
          appeal.summary,
          target,
          apt?.date,
          apt?.slotStart,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        const da = `${a.apt!.date}${a.apt!.slotStart}`;
        const db = `${b.apt!.date}${b.apt!.slotStart}`;
        return da.localeCompare(db);
      });
  }, [
    state.appeals,
    state.appointments,
    state.serviceContent,
    isDeputyView,
    currentUser?.targetId,
    q,
    period,
    isKy,
  ]);

  const prepQueue = queue.filter((qItem) =>
    ["registered", "under_review"].includes(qItem.appeal.stage)
  );
  const liveQueue = queue.filter(
    (qItem) => qItem.appeal.stage === "ready_for_reception"
  );

  const selected = queue.find((qItem) => qItem.appeal.id === selectedId);
  const responsibles = state.staff.filter((s) => s.role === "responsible");

  const reportScope = useMemo(() => {
    const myTarget = currentUser?.targetId;
    const baseAppointments =
      myTarget &&
      (currentUser?.role === "leadership" || currentUser?.role === "responsible")
        ? state.appointments.filter(
            (a) =>
              a.targetId === myTarget &&
              a.status !== "cancelled" &&
              a.status !== "rejected"
          )
        : state.appointments;
    const baseIds = new Set(baseAppointments.map((a) => a.id));
    const baseAppeals = state.appeals.filter((a) =>
      baseIds.has(a.appointmentId)
    );

    // В счётчике и отчёте — только карточки очереди приёма (как в списке ниже).
    const queueStages = new Set([
      "ready_for_reception",
      "under_review",
      "registered",
    ]);
    const queueAppeals = baseAppeals.filter((a) => queueStages.has(a.stage));
    const queueAptIds = new Set(queueAppeals.map((a) => a.appointmentId));
    const queueAppointments = baseAppointments.filter(
      (a) =>
        queueAptIds.has(a.id) &&
        a.status !== "cancelled" &&
        a.status !== "rejected" &&
        a.status !== "pending_review"
    );

    return { appeals: queueAppeals, appointments: queueAppointments };
  }, [
    state.appeals,
    state.appointments,
    currentUser?.targetId,
    currentUser?.role,
  ]);

  const canConduct =
    currentUser && ["leadership", "admin", "reception"].includes(currentUser.role);

  function openItem(appealId: string) {
    setSelectedId(appealId);
    setErr("");
    setLeadershipExplanation("");
    setAssignmentText("");
    setResponsibleUserId("");
    setSpecialistsInvolved("");
  }

  function renderQueueSection(label: string, items: typeof queue) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label} ({items.length})
        </p>
        <ul className="space-y-2">
          {items.map(({ appeal, apt }) => (
            <li key={appeal.id}>
              <button
                type="button"
                onClick={() => openItem(appeal.id)}
                className="w-full rounded-xl border border-court-line px-3 py-3 text-left transition hover:bg-court-mist"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-court-navy">
                      {appeal.fullName}
                    </div>
                    <div
                      className="truncate text-xs text-court-muted"
                      title={appeal.topic}
                    >
                      {appeal.topic}
                    </div>
                  </div>
                  <StageBadge stage={appeal.stage} />
                </div>
                {apt && (
                  <div className="mt-2 text-xs font-medium text-court-blue">
                    {targetShort(apt.targetId, isKy, state.serviceContent)} ·{" "}
                    {formatDateRu(apt.date)} · {apt.slotStart}–{apt.slotEnd}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!currentUser || !selected) return;
    if (!canConduct) {
      setErr("Недостаточно прав для фиксации приёма.");
      return;
    }
    const resp = state.staff.find((s) => s.id === responsibleUserId);
    if (!resp) {
      setErr("Выберите ответственного.");
      return;
    }
    const rec = await completeReception(selected.appeal.id, currentUser, {
      citizenStatement: "",
      leadershipExplanation,
      assignmentText,
      responsibleUserId: resp.id,
      responsibleName: resp.fullName,
      specialistsInvolved,
    });
    if (rec && "ok" in rec && !rec.ok) {
      setErr(rec.error);
      return;
    }
    setSelectedId("");
    setMsg("Приём зафиксирован. Поручение передано на контроль.");
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.reception },
        ]}
      />
      <AdminHeading
        title={isKy ? "Кабыл алуу" : "Приём"}
        lead={
          isDeputyView
            ? isKy
              ? "Сиздин жеке кабыл алууга ырасталган кайрылуулар."
              : "Ваши подтверждённые заявки на личный приём."
            : isKy
              ? "Ырасталган жазылуулар боюнча кабыл алууга даярдоо."
              : "Подтверждённые записи к приёму и подготовка карточек."
        }
      />
      <ReceptionTabs isKy={isKy} />

      <ReportPanel
        appeals={reportScope.appeals}
        appointments={reportScope.appointments}
        serviceContent={state.serviceContent}
        isKy={isKy}
        lang={lang === "ky" ? "ky" : "ru"}
        orgName={t.orgName}
        reportTitle={t.admin.reportTitle}
        reportSubtitle={
          isDeputyView || currentUser?.role === "leadership"
            ? isKy
              ? "Жеке кабыл алуу боюнча"
              : "По личному приёму"
            : t.admin.reportSubtitle
        }
        onPeriodChange={setPeriod}
        search={
          <div className="relative w-40 shrink-0 sm:w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="input !h-9 pl-8 !text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                isKy ? "ФИО, тема…" : "ФИО, тема…"
              }
            />
          </div>
        }
      />

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl font-semibold text-court-navy">
          {isKy ? "Кезек" : "Очередь"}
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({queue.length})
          </span>
        </h2>
        {queue.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              q.trim()
                ? isKy
                  ? "Табылган жок"
                  : "Ничего не найдено"
                : isKy
                  ? "Кезек бош"
                  : "Очередь пуста"
            }
            description={
              q.trim()
                ? isKy
                  ? "Издөө шарттарын өзгөртүңүз."
                  : "Измените условия поиска."
                : isKy
                  ? "Ырасталган кайрылуулар жок."
                  : "Нет подтверждённых обращений."
            }
            className="border-0 shadow-none"
          />
        ) : (
          <div className="space-y-4">
            {renderQueueSection(isKy ? "Даярдоо" : "Подготовка", prepQueue)}
            {renderQueueSection(isKy ? "Протокол" : "К протоколу", liveQueue)}
          </div>
        )}
      </section>

      {selected && (
        <Modal
          title={isKy ? "Кабыл алуунун протоколу" : "Протокол приёма"}
          subtitle={`${selected.appeal.code} · ${selected.appeal.fullName}`}
          onClose={() => setSelectedId("")}
          className="max-w-2xl"
        >
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div className="text-court-muted">{selected.appeal.summary}</div>
            {selected.appeal.prepNotes && (
              <div className="border-t border-slate-200 pt-2 text-xs">
                <strong>Материалы подготовки:</strong> {selected.appeal.prepNotes}
              </div>
            )}
            <Link
              href={`/admin/appeals/${selected.appeal.id}`}
              className="inline-block text-xs font-semibold text-court-blue"
            >
              Открыть полную карточку →
            </Link>
          </div>

          {err && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {err}
            </div>
          )}

          {canConduct ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">Разъяснение руководства</label>
                <textarea
                  className="input min-h-[70px]"
                  value={leadershipExplanation}
                  onChange={(e) => setLeadershipExplanation(e.target.value)}
                  placeholder="Разъяснение в соответствии с законодательством КР (необязательно)…"
                />
              </div>
              <div>
                <label className="label">Поручение</label>
                <textarea
                  className="input min-h-[60px]"
                  value={assignmentText}
                  onChange={(e) => setAssignmentText(e.target.value)}
                  required
                  placeholder="Содержание поручения ответственному…"
                />
              </div>
              <div>
                <label className="label">Ответственный по обращению</label>
                <select
                  className="input"
                  value={responsibleUserId}
                  onChange={(e) => setResponsibleUserId(e.target.value)}
                  required
                >
                  <option value="">— выберите —</option>
                  {responsibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} — {r.position}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Привлечённые специалисты</label>
                <input
                  className="input"
                  value={specialistsInvolved}
                  onChange={(e) => setSpecialistsInvolved(e.target.value)}
                  placeholder="ФИО, подразделение"
                />
              </div>
              <button type="submit" className="btn-primary !text-sm">
                Зафиксировать протокол
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              {selected.apt && (
                <div className="mb-2 font-medium text-court-navy">
                  {formatDateRu(selected.apt.date)} · {selected.apt.slotStart}–
                  {selected.apt.slotEnd}
                </div>
              )}
              Протокол приёма и назначение поручения фиксирует председатель.
              Вы можете просмотреть карточку заявки или перенести запись при
              необходимости.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
