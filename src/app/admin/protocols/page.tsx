"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck2, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminPagination,
  usePagedList,
} from "@/components/ui/AdminPagination";
import { useI18n } from "@/lib/i18n";

/** Журнал протоколов: личный приём (председатель) и протокол исполнителя. */
export default function ProtocolsPage() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);
  const [q, setQ] = useState("");

  const protocols = useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.appeals
      .filter((a) => a.receptionProtocol || a.finalAnswer)
      .filter((a) => {
        if (!query) return true;
        return (
          a.fullName.toLowerCase().includes(query) ||
          a.topic.toLowerCase().includes(query) ||
          a.code.toLowerCase().includes(query) ||
          (a.receptionProtocol?.heldBy || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [state.appeals, q]);

  const { page, setPage, totalPages, slice, total, pageSize } =
    usePagedList(protocols);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: L("Протоколы", "Протоколдор") },
        ]}
      />
      <AdminHeading
        title={L("Протоколы", "Протоколдор")}
        lead={L(
          "Журнал личных приёмов и протоколов исполнения.",
          "Жеке кабыл алуулардын жана аткаруу протоколдорунун журналы."
        )}
      />

      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          className="input !h-9 pl-8 !text-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L("Поиск…", "Издөө…")}
        />
      </div>

      {protocols.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title={
            q.trim()
              ? L("Ничего не найдено", "Табылган жок")
              : L("Протоколов пока нет", "Протоколдор азырынча жок")
          }
          description={
            q.trim()
              ? L("Измените запрос.", "Издөөнү өзгөртүңүз.")
              : L(
                  "Протоколы личного приёма и исполнения появятся здесь.",
                  "Протоколдор бул жерде көрүнөт."
                )
          }
          className="bg-white"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {slice.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/appeals/${a.id}`}
                  className="block px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="min-w-0 truncate font-semibold text-slate-900"
                      title={a.fullName}
                    >
                      {a.fullName}
                    </span>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-500">
                      {a.receptionProtocol
                        ? L("Личный приём", "Жеке кабыл алуу")
                        : L(
                            "Протокол исполнителя",
                            "Аткаруучунун протоколу"
                          )}
                    </span>
                  </div>
                  <div
                    className="mt-1 truncate text-sm text-court-muted"
                    title={a.topic}
                  >
                    {a.topic}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {a.receptionProtocol
                      ? `${a.receptionProtocol.heldBy} · ${new Date(a.receptionProtocol.heldAt).toLocaleString("ru-RU")}`
                      : a.finalAnswerAt &&
                        new Date(a.finalAnswerAt).toLocaleString("ru-RU")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
