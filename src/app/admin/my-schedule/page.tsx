"use client";

import { useStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { MyScheduleEditor } from "@/components/staff/MyScheduleEditor";
import { useI18n } from "@/lib/i18n";

export default function MySchedulePage() {
  const { currentUser } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: L("Мой график", "Графигим") },
        ]}
      />
      <AdminHeading
        title={L("Мой график", "Графигим")}
        lead={L(
          "Дни и часы личного приёма, используемые при записи граждан.",
          "Жарандарды жазуу үчүн колдонулган кабыл алуу күндөрү жана саатары."
        )}
      />
      {currentUser?.targetId ? (
        <MyScheduleEditor isKy={isKy} />
      ) : (
        <p className="text-sm text-court-muted">
          {L(
            "Для вашей учётной записи не задан личный график приёма.",
            "Сиздин каттоо жазууңузга жеке график дайындалган эмес."
          )}
        </p>
      )}
    </div>
  );
}
