"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, CalendarClock, ExternalLink, Inbox, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { ReviewRequestPanel } from "@/components/staff/ReviewRequestPanel";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { formatDateRu, weekdayRu } from "@/lib/slots";
import { targetShort } from "@/lib/targets";
import { useI18n } from "@/lib/i18n";
import { ReportPanel } from "@/components/staff/ReportPanel";
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
import {
  allPeriod,
  filterByPeriod,
  type ReportPeriod,
} from "@/lib/reportPeriods";
import type { Appointment } from "@/lib/types";
import { EllipsisText } from "@/components/ui/EllipsisText";

const FINAL_STATUSES = new Set(["cancelled", "rejected", "completed", "accepted"]);

type InboxSortKey =
  | "status"
  | "name"
  | "phone"
  | "target"
  | "topic"
  | "date"
  | "created";

export default function InboxPage() {
  const { state, currentUser, staffRescheduleAppointment, staffCancelAppointment } =
    useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [newDate, setNewDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>(() => allPeriod());
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState<InboxSortKey>>({
    key: null,
    dir: "asc",
  });

  const canCancel = currentUser?.role === "reception" || currentUser?.role === "admin";

  const journal = useMemo(() => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    let filtered = filterByPeriod(state.appointments, period);
    if (query) {
      filtered = filtered.filter((a) => {
        const hay = [
          a.fullName,
          a.topic,
          a.phone,
          a.code,
          targetShort(a.targetId, isKy, state.serviceContent),
        ]
          .join(" ")
          .toLowerCase();
        if (hay.includes(query)) return true;
        if (digits && a.phone.replace(/\D/g, "").includes(digits)) return true;
        return false;
      });
    }
    return [...filtered].sort((a, b) => {
      const aPending = a.status === "pending_review" ? 0 : 1;
      const bPending = b.status === "pending_review" ? 0 : 1;
      if (!sort.key) {
        if (aPending !== bPending) return aPending - bPending;
        return (b.createdAt || b.updatedAt || "").localeCompare(
          a.createdAt || a.updatedAt || ""
        );
      }
      if (sort.key === "created" || sort.key === "status" || sort.key === "date") {
        if (aPending !== bPending) return aPending - bPending;
      }
      const map: Record<InboxSortKey, string> = {
        status: a.status,
        name: a.fullName,
        phone: a.phone,
        target: targetShort(a.targetId, isKy, state.serviceContent),
        topic: a.topic,
        date: `${a.date}${a.slotStart}`,
        created: a.createdAt || a.updatedAt || "",
      };
      const mapB: Record<InboxSortKey, string> = {
        status: b.status,
        name: b.fullName,
        phone: b.phone,
        target: targetShort(b.targetId, isKy, state.serviceContent),
        topic: b.topic,
        date: `${b.date}${b.slotStart}`,
        created: b.createdAt || b.updatedAt || "",
      };
      return compareValues(map[sort.key], mapB[sort.key], sort.dir);
    });
  }, [state.appointments, state.serviceContent, period, sort, q, isKy]);

  const { page, setPage, totalPages, slice, total, pageSize } =
    usePagedList(journal);

  const open = journal.find((a) => a.id === openId) || null;

  function openRow(apt: Appointment) {
    setOpenId(apt.id);
    setMode("view");
    setNewDate("");
    setNewSlotStart("");
    setNewSlotEnd("");
  }

  function close() {
    setOpenId(null);
    setMode("view");
  }

  async function onReschedule() {
    if (!currentUser || !open) return;
    if (!newDate || !newSlotStart) {
      setErr(true);
      setFlash(L("Выберите дату и время.", "Күн жана убакытты тандаңыз."));
      return;
    }
    setBusy(true);
    const res = await staffRescheduleAppointment(
      open.id,
      newDate,
      newSlotStart,
      newSlotEnd,
      currentUser
    );
    setBusy(false);
    setErr(!res.ok);
    setFlash(res.ok ? L("Запись перенесена.", "Жазылуу которулду.") : res.error);
    if (res.ok) close();
  }

  async function onCancel() {
    if (!currentUser || !open) return;
    setBusy(true);
    const res = await staffCancelAppointment(open.id, currentUser);
    setBusy(false);
    setErr(!res.ok);
    setFlash(res.ok ? L("Запись отменена.", "Жазылуу жокко чыгарылды.") : res.error);
    if (res.ok) close();
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: isKy ? "Өтүнмөлөр" : "Заявки" },
        ]}
      />
      <AdminHeading
        title={isKy ? "Өтүнмөлөр" : "Заявки"}
        lead={
          isKy
            ? "Келип түшкөн өтүнмөлөр. Сапты тандаңыз — ырастоо же жокко чыгаруу."
            : "Поступившие заявки. Выберите строку для подтверждения или отмены записи."
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
          <div className="relative w-44 shrink-0 sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="input !h-9 pl-8 !text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L("Поиск…", "Издөө…")}
            />
          </div>
        }
      />

      {flash && !openId && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            err
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {flash}
        </div>
      )}

      {journal.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            q.trim()
              ? L("Ничего не найдено", "Табылган жок")
              : isKy
                ? "Тандалган мезгилде өтүнмө жок"
                : "Нет заявок за период"
          }
          description={
            q.trim()
              ? L("Измените запрос или период.", "Издөөнү же мезгилди өзгөртүңүз.")
              : L(
                  "Смените месяц/период или дождитесь новых заявок.",
                  "Мезгилди өзгөртүңүз же жаңы өтүнмөлөрдү күтүңүз."
                )
          }
          className="bg-white"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <SortableTh
                    label={L("Заявитель", "Кайрылуучу")}
                    sortKey="name"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={L("Телефон", "Телефон")}
                    sortKey="phone"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={L("Адресат", "Адресат")}
                    sortKey="target"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={L("Тема", "Тема")}
                    sortKey="topic"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={L("Время приёма", "Кабыл алуу убактысы")}
                    sortKey="date"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                  <SortableTh
                    label={L("Статус", "Статус")}
                    sortKey="status"
                    sort={sort}
                    onSort={(k) => setSort((s) => toggleSort(s, k))}
                  />
                </tr>
              </thead>
              <tbody>
                {slice.map((apt) => {
                  const isNew = apt.status === "pending_review";
                  return (
                  <tr
                    key={apt.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => openRow(apt)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {isNew ? (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-rose-500"
                            title={L("Новая заявка", "Жаңы өтүнмө")}
                            aria-label={L("Новая заявка", "Жаңы өтүнмө")}
                          />
                        ) : (
                          <span className="h-2 w-2 shrink-0" aria-hidden />
                        )}
                        <EllipsisText
                          text={apt.fullName}
                          className="font-medium text-slate-900"
                          as="div"
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {apt.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <EllipsisText
                        text={targetShort(
                          apt.targetId,
                          isKy,
                          state.serviceContent
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <EllipsisText text={apt.topic} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDateRu(apt.date)}
                      <span className="ml-1 font-mono">{apt.slotStart}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={apt.status} />
                    </td>
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

      {open && (
        <Modal
          title={`${open.code} · ${open.fullName}`}
          subtitle={
            mode === "reschedule"
              ? L("Новая дата и время", "Жаңы күн жана убакыт")
              : undefined
          }
          onClose={close}
          className={mode === "reschedule" ? "max-w-3xl" : undefined}
        >
          {mode === "view" ? (
            <div className="space-y-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("К кому", "Кимге")}
                  </dt>
                  <dd className="font-medium">
                    {targetShort(open.targetId, isKy, state.serviceContent)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Дата и время", "Күн жана убакыт")}
                  </dt>
                  <dd className="font-medium">
                    {formatDateRu(open.date)} ({weekdayRu(open.date)}) · {open.slotStart}–
                    {open.slotEnd}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Телефон", "Телефон")}
                  </dt>
                  <dd className="font-medium">{open.phone}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Категория", "Категория")}
                  </dt>
                  <dd className="font-medium">{t.categories[open.category]}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase text-slate-400">
                    {L("Адрес заявителя", "Кайрылуучунун дареги")}
                  </dt>
                  <dd className="font-medium">
                    {[open.region, open.locality, open.street].filter(Boolean).join(", ") ||
                      "—"}
                  </dd>
                </div>
              </dl>

              {flash && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    err
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {flash}
                </div>
              )}

              {open.status === "pending_review" && (
                <ReviewRequestPanel
                  appointment={open}
                  isKy={isKy}
                  compact
                  onDone={(ok, message) => {
                    setErr(!ok);
                    setFlash(message);
                    if (ok) close();
                  }}
                />
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {!FINAL_STATUSES.has(open.status) && (
                  <button
                    type="button"
                    onClick={() => setMode("reschedule")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    {L("Перенести запись", "Жазылууну которуу")}
                  </button>
                )}
                {canCancel && !FINAL_STATUSES.has(open.status) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />
                    {L("Отменить запись", "Жазылууну жокко чыгаруу")}
                  </button>
                )}
                {(() => {
                  const appeal = state.appeals.find((a) => a.appointmentId === open.id);
                  return appeal ? (
                    <Link
                      href={`/admin/appeals/${appeal.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {L("Полная карточка", "Толук карточка")}
                    </Link>
                  ) : null;
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <SlotPicker
                date={newDate}
                slotStart={newSlotStart}
                onDateChange={setNewDate}
                onSlotChange={(s, e) => {
                  setNewSlotStart(s);
                  setNewSlotEnd(e);
                }}
                excludeAppointmentId={open.id}
                targetId={open.targetId}
              />
              {flash && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    err
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {flash}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onReschedule}
                  className="btn-primary !text-sm"
                >
                  {L("Перенести", "Которуу")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("view")}
                  className="btn-outline !text-sm"
                >
                  {L("Отмена", "Жокко чыгаруу")}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
