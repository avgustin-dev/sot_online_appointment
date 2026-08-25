"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileCheck2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Журнал протоколов: личный приём (председатель) и протокол исполнителя. */
export default function ProtocolsPage() {
  const { state } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const protocols = useMemo(
    () =>
      state.appeals
        .filter((a) => a.receptionProtocol || a.finalAnswer)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.appeals]
  );

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

      {protocols.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title={L("Протоколов пока нет", "Протоколдор азырынча жок")}
          description={L(
            "Протоколы личного приёма и исполнения появятся здесь.",
            "Протоколдор бул жерде көрүнөт."
          )}
          className="bg-white"
        />
      ) : (
        <ul className="space-y-2">
          {protocols.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-court-muted">{a.code}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-500">
                  {a.receptionProtocol
                    ? L("Личный приём", "Жеке кабыл алуу")
                    : L("Протокол исполнителя", "Аткаруучунун протоколу")}
                </span>
              </div>
              <div className="mt-1 font-semibold text-slate-900">{a.fullName}</div>
              <div className="text-sm text-court-muted">{a.topic}</div>
              <div className="mt-2 text-xs text-slate-500">
                {a.receptionProtocol
                  ? `${a.receptionProtocol.heldBy} · ${new Date(a.receptionProtocol.heldAt).toLocaleString("ru-RU")}`
                  : a.finalAnswerAt && new Date(a.finalAnswerAt).toLocaleString("ru-RU")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
