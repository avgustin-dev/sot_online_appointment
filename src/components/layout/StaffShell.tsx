"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  FilePenLine,
  ChartColumn,
  ExternalLink,
  GitBranch,
  BookOpen,
  Inbox,
  FileCheck2,
  CalendarClock,
  ScrollText,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/PageLoader";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { useI18n } from "@/lib/i18n";
import { EmblemKR } from "@/components/brand/Emblem";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  prefixes?: string[];
  badge?: number;
};

export function StaffShell({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, ready, setAdminModule, state } = useStore();
  const { lang } = useI18n();
  const isKy = lang === "ky";
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = state.appointments.filter(
    (a) => a.status === "pending_review"
  ).length;
  const overdueCount = state.appeals.filter(
    (a) =>
      a.stage === "in_control" &&
      a.assignment?.dueDate &&
      a.assignment.dueDate < today &&
      a.assignment.status !== "done"
  ).length;

  const survey = pathname.startsWith("/admin/survey");
  const role = currentUser?.role;

  const canInbox = role === "admin" || role === "reception";
  const canReception =
    role === "admin" ||
    role === "leadership" ||
    (role === "responsible" && !!currentUser?.targetId);
  const canJournal =
    role === "admin" || role === "reception" || role === "leadership";
  const canControl =
    role === "admin" || role === "leadership" || role === "responsible";
  const canProtocols = role === "admin" || role === "leadership";
  const canMySchedule =
    (role === "admin" || role === "leadership" || role === "responsible") &&
    !!currentUser?.targetId;
  const canAnalytics = role === "admin" || role === "reception";
  const canContent = role === "admin" || role === "reception";
  const canSchedules = role === "admin" || role === "reception";
  const canEligibility = role === "admin";
  const canSurvey = role === "admin";
  const canViewJournal = role === "admin" || role === "reception";

  const workNav: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        href: "/admin",
        label: isKy ? "Бүгүн" : "Сегодня",
        icon: LayoutDashboard,
        exact: true,
      },
    ];
    if (canInbox) {
      items.push({
        href: "/admin/inbox",
        label: isKy ? "Өтүнмөлөр" : "Заявки",
        icon: Inbox,
        badge: pendingCount || undefined,
      });
    }
    if (canReception) {
      items.push({
        href: "/admin/reception",
        label: isKy ? "Кабыл алуу" : "Приём",
        icon: Users,
        prefixes: ["/admin/reception", "/admin/calendar"],
      });
    }
    if (canJournal) {
      items.push({
        href: "/admin/appeals",
        label: isKy ? "Кайрылуулар" : "Заявки и обращения",
        icon: FileText,
      });
    }
    if (canControl) {
      items.push({
        href: "/admin/control",
        label: isKy ? "Тапшырмалар" : "Поручения",
        icon: ClipboardCheck,
        badge: overdueCount || undefined,
      });
    }
    if (canProtocols) {
      items.push({
        href: "/admin/protocols",
        label: isKy ? "Протоколдор" : "Протоколы",
        icon: FileCheck2,
      });
    }
    return items;
  }, [isKy, canInbox, canReception, canJournal, canControl, canProtocols, pendingCount, overdueCount]);

  const refNav: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (canMySchedule) {
      items.push({
        href: "/admin/my-schedule",
        label: isKy ? "Графигим" : "Мой график",
        icon: CalendarClock,
      });
    }
    if (canAnalytics) {
      items.push({
        href: "/admin/analytics",
        label: isKy ? "Мониторинг" : "Мониторинг",
        icon: BarChart3,
      });
    }
    if (canContent) {
      items.push({
        href: "/admin/content",
        label: isKy ? "Сайт" : "Сайт",
        icon: FilePenLine,
      });
    }
    if (canEligibility) {
      items.push({
        href: "/admin/eligibility",
        label: isKy ? "Допуск" : "Допуск",
        icon: GitBranch,
      });
    }
    if (canSchedules) {
      items.push({
        href: "/admin/settings",
        label: isKy ? "График" : "График",
        icon: Settings,
      });
    }
    if (canViewJournal) {
      items.push({
        href: "/admin/journal",
        label: isKy ? "Аракеттер журналы" : "Журнал действий",
        icon: ScrollText,
      });
    }
    items.push({
      href: "/admin/help",
      label: isKy ? "Нускама" : "Инструкция",
      icon: BookOpen,
    });
    return items;
  }, [
    isKy,
    canMySchedule,
    canAnalytics,
    canContent,
    canEligibility,
    canSchedules,
    canViewJournal,
  ]);

  const surveyNav: NavItem[] = useMemo(
    () => [
      {
        href: "/admin/survey",
        label: isKy ? "Суроолор" : "Вопросы",
        icon: ClipboardList,
        exact: true,
      },
      {
        href: "/admin/survey/results",
        label: isKy ? "Жыйынтыктар" : "Результаты",
        icon: ChartColumn,
      },
    ],
    [isKy]
  );

  // Правило доступа к разделу по роли — тот же набор условий, что и для
  // видимости пункта меню (canInbox/canReception/…). Раньше проверялся
  // только факт входа, но не роль: сотрудник мог открыть скрытый в меню
  // раздел прямым URL и увидеть данные, к которым не должен иметь доступ.
  const routeGuards: { prefix: string; allowed: boolean }[] = [
    { prefix: "/admin/inbox", allowed: canInbox },
    { prefix: "/admin/reception", allowed: canReception },
    { prefix: "/admin/calendar", allowed: canReception },
    { prefix: "/admin/appeals", allowed: canJournal },
    { prefix: "/admin/control", allowed: canControl },
    { prefix: "/admin/protocols", allowed: canProtocols },
    { prefix: "/admin/my-schedule", allowed: canMySchedule },
    { prefix: "/admin/analytics", allowed: canAnalytics },
    { prefix: "/admin/content", allowed: canContent },
    { prefix: "/admin/eligibility", allowed: canEligibility },
    { prefix: "/admin/settings", allowed: canSchedules },
    { prefix: "/admin/journal", allowed: canViewJournal },
    { prefix: "/admin/survey", allowed: canSurvey },
  ];
  const guardRule = routeGuards.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
  const routeAllowed = !guardRule || guardRule.allowed;

  useEffect(() => {
    if (ready && !currentUser && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [ready, currentUser, pathname, router]);

  useEffect(() => {
    if (ready && currentUser && !routeAllowed) {
      router.replace("/admin");
    }
  }, [ready, currentUser, routeAllowed, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <PageLoader
          label={
            isKy
              ? "Кызматтык кабинет жүктөлүүдө…"
              : "Загрузка служебного кабинета…"
          }
        />
      </div>
    );
  }

  if (!currentUser || !routeAllowed) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <PageLoader
          label={isKy ? "Багыттоо…" : "Перенаправление…"}
        />
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    admin: isKy ? "Администратор" : "Администратор",
    reception: isKy ? "Маалымдама" : "Справочная",
    leadership: isKy ? "Төрага" : "Председатель",
    responsible: isKy ? "Аткаруучу" : "Исполнитель",
  };

  function isActive(item: NavItem) {
    const prefixes = item.prefixes || [item.href];
    if (item.exact) return pathname === item.href;
    return prefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }

  function renderNav(items: NavItem[]) {
    return items.map((item) => {
      const active = isActive(item);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
            active
              ? "bg-court-navy text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "opacity-95" : "text-slate-400"
            )}
          />
          <span className="min-w-0 flex-1 font-medium">{item.label}</span>
          {item.badge ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                active ? "bg-white text-court-navy" : "bg-rose-600 text-white"
              )}
            >
              {item.badge}
            </span>
          ) : null}
        </Link>
      );
    });
  }

  const nav = workNav;

  return (
    <div className="min-h-screen bg-[#f0f2f5] lg:flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[88vw] flex-col border-r border-slate-200/80 bg-white shadow-sm transition duration-200 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-slate-100 px-3 py-2.5">
          <EmblemKR size={42} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold leading-snug text-slate-800 sm:text-[11px]">
              {isKy
                ? "Кыргыз Республикасынын Жогорку соту"
                : "Верховный суд Кыргызской Республики"}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
              {isKy ? "Служебный кабинет" : "Служебный кабинет"}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {canSurvey && (
          <div className="shrink-0 border-b border-slate-100 p-2">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <Link
                href="/admin"
                onClick={() => {
                  setAdminModule("reception");
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-2 text-center text-[11px] font-semibold leading-tight transition",
                  !survey
                    ? "bg-white text-court-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {isKy ? "Жарандарды кабыл алуу" : "Приём граждан"}
              </Link>
              <Link
                href="/admin/survey"
                onClick={() => {
                  setAdminModule("survey");
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-center text-[11px] font-semibold leading-tight transition",
                  survey
                    ? "bg-white text-court-navy shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span className="block">
                  {isKy ? "Сурамжылоо" : "Опросник"}
                </span>
                <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-wide text-amber-700">
                  {isKy ? "Иштелип жатат" : "В разработке"}
                </span>
              </Link>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {survey ? (
            <div>
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isKy ? "Сурамжылоо" : "Опросник"}
              </div>
              <div className="space-y-0.5">{renderNav(surveyNav)}</div>
            </div>
          ) : (
            <>
              <div>
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {isKy ? "Жарандарды кабыл алуу" : "Приём граждан"}
                </div>
                <div className="space-y-0.5">{renderNav(nav)}</div>
              </div>
              <div>
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {isKy ? "Маалымдама" : "Справочник"}
                </div>
                <div className="space-y-0.5">{renderNav(refNav)}</div>
              </div>
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="truncate text-sm font-semibold text-slate-900">
              {currentUser.fullName}
            </div>
            <div className="truncate text-xs text-slate-500">
              {roleLabel[currentUser.role]}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/admin/login");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            {isKy ? "Чыгуу" : "Выход"}
          </button>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Закрыть меню"
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:h-16 sm:px-5">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {survey
                ? isKy
                  ? "Соттордун сурамжылоосу — иштелип жатат"
                  : "Опросник судов — в разработке"
                : isKy
                  ? "Приём граждан"
                  : "Приём граждан"}
            </div>
            <div className="hidden truncate text-xs text-slate-500 sm:block">
              {roleLabel[currentUser.role]} · {currentUser.position}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {canInbox && pendingCount > 0 && !survey && (
              <Link
                href="/admin/inbox"
                className="hidden items-center rounded-lg bg-court-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-court-navy/90 sm:inline-flex"
              >
                {isKy ? "Өтүнмөлөр" : "Заявки"}: {pendingCount}
              </Link>
            )}
            <LangSwitch />
            <Link
              href={survey ? "/survey" : "/"}
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {survey
                ? isKy
                  ? "Анкета"
                  : "Анкета"
                : isKy
                  ? "Коомдук бөлүм"
                  : "Публичный раздел"}
            </Link>
          </div>
        </header>
        <main className="admin-page-enter flex-1 p-3 sm:p-5 lg:p-7">
          {survey && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {isKy
                ? "Модуль «Опросник судов» иштелип жатат. Анкетанын толук иштеши кийинчерээк кошулат."
                : "Модуль «Опросник судов» в разработке. Полноценная работа анкеты будет подключена отдельно."}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
