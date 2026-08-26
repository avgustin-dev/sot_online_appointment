"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n";
import { targetShort } from "@/lib/targets";
import { assignmentStatusLabel } from "@/lib/assignment";
import { formatDateRu } from "@/lib/slots";
import {
  AdminPagination,
  usePagedList,
} from "@/components/ui/AdminPagination";
import {
  SortableTh,
  compareValues,
  toggleSort,
  type SortState,
} from "@/components/ui/SortableTh";
import { EllipsisText } from "@/components/ui/EllipsisText";
import { ReportPanel } from "@/components/staff/ReportPanel";
import {
  allPeriod,
  filterByPeriod,
  type ReportPeriod,
} from "@/lib/reportPeriods";

type AppealSortKey =
  | "name"
  | "topic"
  | "target"
  | "status"
  | "stage"
  | "created"
  | "visit";

function isoDay(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function AppealsListPage() {
  const { state, currentUser, assignAppeal } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<
    "all" | "pending" | "prep" | "reception" | "control" | "closed"
  >("all");
  const [sort, setSort] = useState<SortState<AppealSortKey>>({
    key: null,
    dir: "asc",
  });
  const [period, setPeriod] = useState<ReportPeriod>(() => allPeriod());
  const canAssign =
    currentUser?.role === "leadership" || currentUser?.role === "admin";
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [assignText, setAssignText] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignErr, setAssignErr] = useState("");
  const responsibles = state.staff.filter((s) => s.role === "responsible");
  const assignTarget = state.appeals.find((a) => a.id === assignId);

  async function onAssign() {
    const resp = state.staff.find((s) => s.id === assignTo);
    if (!assignTarget || !resp || !assignText.trim()) {
      setAssignErr(
        isKy
          ? "Аткаруучуну жана тапшырманы көрсөтүңүз."
          : "Выберите исполнителя и укажите текст поручения."
      );
      return;
    }
    setAssignBusy(true);
    const res = await assignAppeal(
      assignTarget.id,
      resp.id,
      resp.fullName,
      assignText.trim()
    );
    setAssignBusy(false);
    if (!res.ok) {
      setAssignErr(res.error);
      return;
    }
    setAssignId(null);
    setAssignTo("");
    setAssignText("");
    setAssignErr("");
  }

  function appointmentOf(appointmentId: string) {
    return state.appointments.find((x) => x.id === appointmentId);
  }

  const list = useMemo(() => {
    const inPeriod = new Set(
      filterByPeriod(state.appointments, period).map((a) => a.id)
    );
    const rows = state.appeals
      .filter((a) => inPeriod.has(a.appointmentId))
      .filter((a) => {
        const apt = state.appointments.find((x) => x.id === a.appointmentId);
        if (bucket === "pending") return apt?.status === "pending_review";
        if (bucket === "prep")
          return (
            apt?.status !== "pending_review" &&
            ["registered", "under_review"].includes(a.stage)
          );
        if (bucket === "reception") return a.stage === "ready_for_reception";
        if (bucket === "control") return a.stage === "in_control";
        if (bucket === "closed")
          return ["answered", "closed", "cancelled"].includes(a.stage);
        return true;
      })
      .filter((a) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        const pin = state.appointments
          .find((x) => x.id === a.appointmentId)
          ?.pin?.toLowerCase();
        const target = state.appointments.find((x) => x.id === a.appointmentId);
        const targetLabel = target
          ? targetShort(target.targetId, isKy, state.serviceContent).toLowerCase()
          : "";
        return (
          a.code.toLowerCase().includes(s) ||
          a.fullName.toLowerCase().includes(s) ||
          a.topic.toLowerCase().includes(s) ||
          a.phone.includes(s) ||
          targetLabel.includes(s) ||
          (pin ? pin.includes(s) : false)
        );
      });

    return [...rows].sort((a, b) => {
      if (!sort.key) {
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      }
      const aptA = appointmentOf(a.appointmentId);
      const aptB = appointmentOf(b.appointmentId);
      const vals: Record<AppealSortKey, string> = {
        name: a.fullName,
        topic: a.topic,
        target: aptA?.targetId || "",
        status: aptA?.status || "",
        stage: a.stage,
        created: isoDay(a.createdAt),
        visit: `${aptA?.date || ""}${aptA?.slotStart || ""}`,
      };
      const valsB: Record<AppealSortKey, string> = {
        name: b.fullName,
        topic: b.topic,
        target: aptB?.targetId || "",
        status: aptB?.status || "",
        stage: b.stage,
        created: isoDay(b.createdAt),
        visit: `${aptB?.date || ""}${aptB?.slotStart || ""}`,
      };
      return compareValues(vals[sort.key], valsB[sort.key], sort.dir);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.appeals, state.appointments, state.serviceContent, q, bucket, sort, period, isKy]);

  const { page, setPage, totalPages, slice, total, pageSize } =
    usePagedList(list);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.appeals },
        ]}
      />
      <AdminHeading
        title={isKy ? "Карточкалар" : "Карточки"}
        lead={
          isKy
            ? "Кайрылуулардын карточкалары. Сапты басыңыз — толук маалымат жана аракеттер."
            : "Карточки обращений. Нажмите строку, чтобы открыть сведения и доступные действия."
        }
      />

      <ReportPanel
        appeals={state.appeals}
        appointments={state.appointments}
        serviceContent={state.serviceContent}
        isKy={isKy}
        lang={lang === "ky" ? "ky" : "ru"}
        orgName={t.orgName}
        reportTitle={t.admin.reportTitle}
        reportSubtitle={t.admin.reportSubtitle}
        onPeriodChange={setPeriod}
        search={
          <div className="relative w-40 shrink-0 sm:w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-court-muted" />
            <input
              id="q"
              className="input !h-9 pl-8 !text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isKy ? "Издөө…" : "Поиск…"}
            />
          </div>
        }
        filters={
          <>
            {(
              [
                ["all", isKy ? "Баары" : "Все"],
                ["pending", isKy ? "Өтүнмөлөр" : "Заявки"],
                ["prep", isKy ? "Даярдоо" : "Подготовка"],
                ["reception", isKy ? "Кабыл алуу" : "Приём"],
                ["control", isKy ? "Тапшырмалар" : "Поручения"],
                ["closed", isKy ? "Жабык" : "Закрытые"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setBucket(id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium ${
                  bucket === id
                    ? "border-court-navy bg-court-navy text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isKy ? "Табылган жок" : "Сведения не найдены"}
          description={
            isKy
              ? "Издөө шарттарын өзгөртүңүз."
              : "Измените условия поиска."
          }
        />
      ) : (
        <div className="page-enter overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <SortableTh
                    label={isKy ? "Кайрылуучу" : "Заявитель"}
                    sortKey="name"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Тема" : "Тема обращения"}
                    sortKey="topic"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Адресат" : "Адресат"}
                    sortKey="target"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Этап" : "Этап"}
                    sortKey="stage"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Кайрылуу күнү" : "Дата обращения"}
                    sortKey="created"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Кабыл алуу убактысы" : "Время приёма"}
                    sortKey="visit"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={isKy ? "Жазылуу" : "Статус записи"}
                    sortKey="status"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  {canAssign && (
                    <th>{isKy ? "Тапшырма" : "Поручение"}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {slice.map((a) => {
                  const apt = appointmentOf(a.appointmentId);
                  const targetLabel = apt
                    ? targetShort(apt.targetId, isKy, state.serviceContent)
                    : "—";
                  const isNew = apt?.status === "pending_review";
                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer border-t border-court-line hover:bg-court-mist/50"
                      onClick={() => router.push(`/admin/appeals/${a.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {isNew ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-rose-500"
                              title={isKy ? "Жаңы өтүнмө" : "Новая заявка"}
                              aria-label={isKy ? "Жаңы өтүнмө" : "Новая заявка"}
                            />
                          ) : (
                            <span className="h-2 w-2 shrink-0" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <EllipsisText
                              text={a.fullName}
                              className="font-medium text-court-navy"
                              as="div"
                            />
                            {a.previousAppealIds.length > 0 && (
                              <div className="text-[11px] text-amber-700">
                                {isKy ? "кайталанма" : "повторное"}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-court-muted">
                        <EllipsisText text={a.topic} />
                      </td>
                      <td className="px-4 py-3 text-court-muted">
                        <EllipsisText text={targetLabel} />
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={a.stage} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {a.createdAt ? formatDateRu(isoDay(a.createdAt)) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {apt?.date ? (
                          <>
                            {formatDateRu(apt.date)}
                            <span className="ml-1 font-mono">{apt.slotStart}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {apt ? <StatusBadge status={apt.status} /> : "—"}
                      </td>
                      {canAssign && (
                        <td className="px-4 py-3">
                          {a.assignment ? (
                            <EllipsisText
                              text={`${a.assignment.responsibleName}${
                                a.assignment.status
                                  ? ` · ${assignmentStatusLabel(a.assignment.status, isKy)}`
                                  : ""
                              }`}
                              className="text-xs text-court-muted"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignId(a.id);
                                setAssignErr("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-court-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-court-navy/90"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {isKy ? "Тапшыруу" : "Поручить"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            isKy={isKy}
          />
        </div>
      )}

      {assignTarget && (
        <Modal
          title={isKy ? "Тапшыруу" : "Поручить обращение"}
          subtitle={`${assignTarget.code} · ${assignTarget.fullName}`}
          onClose={() => setAssignId(null)}
        >
          <div className="space-y-3">
            <select
              className="input"
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            >
              <option value="">
                {isKy ? "— аткаруучу —" : "— исполнитель —"}
              </option>
              {responsibles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} — {r.position}
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-[80px]"
              placeholder={isKy ? "Тапшырманын тексти" : "Текст поручения"}
              value={assignText}
              onChange={(e) => setAssignText(e.target.value)}
            />
            {assignErr && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {assignErr}
              </div>
            )}
            <button
              type="button"
              disabled={assignBusy}
              onClick={onAssign}
              className="btn-primary !text-sm"
            >
              {isKy ? "Тапшырманы жөнөтүү" : "Отправить поручение"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
