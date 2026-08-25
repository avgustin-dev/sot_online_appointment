"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Inbox,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { StatusBadge, StageBadge } from "@/components/ui/Badge";
import { formatDateRu } from "@/lib/slots";
import { useI18n } from "@/lib/i18n";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { targetShort } from "@/lib/targets";

export default function StaffDashboardPage() {
  const { state, currentUser } = useStore();
  const { lang } = useI18n();
  const isKy = lang === "ky";
  const today = new Date().toISOString().slice(0, 10);
  const role = currentUser?.role;

  const pending = useMemo(
    () =>
      state.appointments
        .filter((a) => a.status === "pending_review")
        .sort((a, b) =>
          `${a.date}${a.slotStart}`.localeCompare(`${b.date}${b.slotStart}`)
        ),
    [state.appointments]
  );

  const todayApts = useMemo(
    () =>
      state.appointments
        .filter(
          (a) =>
            a.date === today &&
            a.status !== "cancelled" &&
            a.status !== "rejected"
        )
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart)),
    [state.appointments, today]
  );

  const prep = state.appeals.filter((a) => {
    const apt = state.appointments.find((x) => x.id === a.appointmentId);
    if (!apt || apt.status === "pending_review" || apt.status === "rejected")
      return false;
    return ["registered", "under_review"].includes(a.stage);
  });

  const ready = state.appeals.filter((a) => {
    const apt = state.appointments.find((x) => x.id === a.appointmentId);
    if (!apt || apt.status === "pending_review" || apt.status === "rejected")
      return false;
    return a.stage === "ready_for_reception";
  });

  const controlOpen = state.appeals.filter((a) => {
    if (a.stage !== "in_control" || !a.assignment) return false;
    if (a.assignment.status === "done") return false;
    if (role === "responsible") {
      return a.assignment.responsibleUserId === currentUser?.id;
    }
    return true;
  });

  const overdue = controlOpen.filter(
    (a) => a.assignment?.dueDate && a.assignment.dueDate < today
  );

  function appealIdForApt(aptId: string) {
    return state.appeals.find((a) => a.appointmentId === aptId)?.id;
  }

  const roleHint =
    role === "admin"
      ? isKy
        ? "Толук обзор: өтүнмөлөр, кабыл алуу, карточкалар, тапшырмалар жана справочник."
        : "Полный обзор: заявки, приём, карточки, поручения и справочник."
      : role === "responsible"
      ? isKy
        ? "Сиздин бөлүм: тапшырмалардын аткарылышы жана жооп."
        : "Ваш раздел: исполнение поручений и ответ заявителю."
      : role === "leadership"
        ? isKy
          ? "Сиздин бөлүм: жеке кабыл алуу жана протокол."
          : "Ваш раздел: личный приём и протокол."
        : role === "reception"
          ? isKy
            ? "Сиздин бөлүм: өтүнмөлөрдү кароо жана карточканы даярдоо."
            : "Ваш раздел: рассмотрение заявок и подготовка карточки."
          : isKy
            ? "Бардык бөлүмдөр жеткиликтүү."
            : "Доступны все разделы кабинета.";

  const showQueue = role !== "responsible";

  return (
    <div className="space-y-5">
      <AdminHeading
        title={isKy ? "Бүгүн" : "Сегодня"}
        lead={roleHint}
      />

      {showQueue && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/inbox"
            className={`rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300 ${
              pending.length ? "border-sky-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Inbox className="h-4 w-4" />
              {isKy ? "1. Өтүнмөлөр" : "1. Заявки"}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold text-slate-900">
              {pending.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isKy
                ? "Ырастоо же баш тартуу"
                : "Подтверждение либо отказ"}
            </p>
          </Link>
          <Link
            href="/admin/reception"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4" />
              {isKy ? "2. Кабыл алуу" : "2. Приём"}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold text-slate-900">
              {prep.length + ready.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isKy
                ? `Даярдоо ${prep.length} · протокол ${ready.length}`
                : `Подготовка ${prep.length} · протокол ${ready.length}`}
            </p>
          </Link>
          <Link
            href="/admin/control"
            className={`rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300 ${
              overdue.length ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardCheck className="h-4 w-4" />
              {isKy ? "3. Тапшырмалар" : "3. Поручения"}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold text-slate-900">
              {controlOpen.length}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {isKy
                ? `Мөөнөтү өткөн: ${overdue.length}`
                : `Просрочено: ${overdue.length}`}
            </p>
          </Link>
        </div>
      )}

      {!showQueue && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/control"
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              overdue.length ? "border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isKy ? "Ачык тапшырмалар" : "Открытые поручения"}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">
              {controlOpen.length}
            </div>
          </Link>
          <Link
            href="/admin/control"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {isKy ? "Мөөнөтү өткөн" : "Просрочено"}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">
              {overdue.length}
            </div>
          </Link>
        </div>
      )}

      {showQueue && pending.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {isKy ? "К кароого" : "К рассмотрению"}
            </h2>
            <Link
              href="/admin/inbox"
              className="text-sm font-medium text-court-blue hover:underline"
            >
              {isKy ? "Бардыгы" : "Все заявки"}
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {pending.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  href="/admin/inbox"
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {a.fullName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {a.code} · {targetShort(a.targetId, isKy, state.serviceContent)} · {a.topic}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-600">
                    {formatDateRu(a.date)} · {a.slotStart}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {isKy ? "Бүгүнкү жазылуулар" : "Записи на сегодня"}
          </h2>
          {showQueue && (
            <Link
              href="/admin/calendar"
              className="text-sm font-medium text-court-blue hover:underline"
            >
              {isKy ? "Расписание" : "Расписание"}
            </Link>
          )}
        </div>
        {todayApts.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">
            {isKy ? "Бүгүн жазылуу жок." : "На сегодня записей нет."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todayApts.map((a) => {
              const aplId = appealIdForApt(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={
                      aplId
                        ? `/admin/appeals/${aplId}`
                        : showQueue
                          ? "/admin/calendar"
                          : "/admin/appeals"
                    }
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {a.slotStart}–{a.slotEnd} · {a.fullName}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {targetShort(a.targetId, isKy, state.serviceContent)} · {a.topic}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={a.status} />
                      <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {controlOpen.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {isKy ? "Ачык тапшырмалар" : "Открытые поручения"}
            </h2>
            <Link
              href="/admin/control"
              className="text-sm font-medium text-court-blue hover:underline"
            >
              {isKy ? "Бөлүм" : "Раздел"}
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {[...controlOpen]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 5)
              .map((a) => (
              <li key={a.id}>
                <Link
                  href="/admin/control"
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {a.code} · {a.fullName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {a.assignment?.responsibleName} · {a.topic}
                    </div>
                  </div>
                  <StageBadge stage={a.stage} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
