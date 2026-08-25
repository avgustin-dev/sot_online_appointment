"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { StageBadge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { Modal } from "@/components/ui/Modal";
import { FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { targetShort } from "@/lib/targets";
import { assignmentStatusLabel } from "@/lib/assignment";

export default function AppealsListPage() {
  const { state, currentUser, assignAppeal } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<
    "all" | "pending" | "prep" | "reception" | "control" | "closed"
  >("all");
  const canAssign = currentUser?.role === "leadership" || currentUser?.role === "admin";
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
        isKy ? "Аткаруучуну жана тапшырманы көрсөтүңүз." : "Выберите исполнителя и укажите текст поручения."
      );
      return;
    }
    setAssignBusy(true);
    const res = await assignAppeal(assignTarget.id, resp.id, resp.fullName, assignText.trim());
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
    return state.appeals
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
        if (!q.trim()) return true;
        return true;
      })
      .filter((a) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        const pin = state.appointments
          .find((x) => x.id === a.appointmentId)
          ?.pin?.toLowerCase();
        return (
          a.code.toLowerCase().includes(s) ||
          a.fullName.toLowerCase().includes(s) ||
          a.topic.toLowerCase().includes(s) ||
          a.phone.includes(s) ||
          (pin ? pin.includes(s) : false)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [state.appeals, state.appointments, q, bucket]);

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
            ? "Реестр. Сапты басыңыз — карточка ачылат."
            : "Реестр обращений. Нажмите строку — откроется карточка."
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
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
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                bucket === id
                  ? "border-court-navy bg-court-navy text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-court-muted" />
          <input
            id="q"
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              isKy ? "Код, ФИО, тема, телефон" : "Код, ФИО, тема, телефон"
            }
          />
        </div>
      </div>

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
                  <th>{isKy ? "Каттоо коду" : "Рег. код"}</th>
                  <th>PIN</th>
                  <th>{isKy ? "Кайрылуучу" : "Заявитель"}</th>
                  <th>{isKy ? "Тема" : "Тема обращения"}</th>
                  <th>{isKy ? "Адресат" : "Адресат"}</th>
                  <th>{isKy ? "Жазылуу" : "Статус записи"}</th>
                  <th>{isKy ? "Этап" : "Этап"}</th>
                  {canAssign && <th>{isKy ? "Тапшырма" : "Поручение"}</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const apt = appointmentOf(a.appointmentId);
                  return (
                  <tr
                    key={a.id}
                    className="cursor-pointer border-t border-court-line hover:bg-court-mist/50"
                    onClick={() => router.push(`/admin/appeals/${a.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/appeals/${a.id}`}
                        className="font-mono font-semibold text-court-blue hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.code}
                      </Link>
                      {a.previousAppealIds.length > 0 && (
                        <div className="text-[11px] text-amber-700">
                          {isKy ? "кайталанма" : "повторное"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-bold tracking-wider text-slate-900"
                        title={
                          isKy
                            ? "PIN — «Менин жазылууум»"
                            : "PIN — раздел «Моя запись»"
                        }
                      >
                        {apt?.pin ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-court-navy">
                        {a.fullName}
                      </div>
                      <div className="text-xs text-court-muted">{a.phone}</div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-court-muted">
                      {a.topic}
                    </td>
                    <td className="px-4 py-3 text-court-muted">
                      {apt ? targetShort(apt.targetId, isKy, state.serviceContent) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {apt ? <StatusBadge status={apt.status} /> : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={a.stage} />
                    </td>
                    {canAssign && (
                      <td className="px-4 py-3">
                        {a.assignment ? (
                          <span className="text-xs text-court-muted">
                            {a.assignment.responsibleName}
                            {a.assignment.status
                              ? ` · ${assignmentStatusLabel(a.assignment.status, isKy)}`
                              : ""}
                          </span>
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
              <option value="">{isKy ? "— аткаруучу —" : "— исполнитель —"}</option>
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
