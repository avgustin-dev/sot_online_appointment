"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AdminHeading } from "@/components/staff/AdminHeading";
import { MyScheduleEditor } from "@/components/staff/MyScheduleEditor";
import { useI18n } from "@/lib/i18n";

/**
 * Админ выбирает лицо из графика приёма (председатель / исполнители /
 * приёмная) и правит его расписание — единственное альтернативное место
 * (помимо личного кабинета самого сотрудника), где можно менять график.
 */
function AdminSchedulePicker({ isKy }: { isKy: boolean }) {
  const { state } = useStore();
  const L = (ru: string, ky: string) => (isKy ? ky : ru);
  const people = state.serviceContent.leadership.filter((p) => p.bookable);
  const [pickedId, setPickedId] = useState("");

  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-5">
        <label className="label">
          {L("Сотрудник", "Кызматкер")}
        </label>
        <select
          className="input"
          value={pickedId}
          onChange={(e) => setPickedId(e.target.value)}
        >
          <option value="">{L("— выберите —", "— тандаңыз —")}</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {(isKy ? p.fullNameKy || p.fullNameRu : p.fullNameRu || p.fullNameKy) +
                " — " +
                (isKy ? p.positionKy || p.positionRu : p.positionRu || p.positionKy)}
            </option>
          ))}
        </select>
      </div>
      {pickedId && <MyScheduleEditor isKy={isKy} targetId={pickedId} />}
    </div>
  );
}

export default function MySchedulePage() {
  const { currentUser } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const L = (ru: string, ky: string) => (isKy ? ky : ru);
  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: isAdmin ? L("Графики", "Графиктер") : L("Мой график", "Графигим") },
        ]}
      />
      <AdminHeading
        title={isAdmin ? L("Графики сотрудников", "Кызматкерлердин графиктери") : L("Мой график", "Графигим")}
        lead={
          isAdmin
            ? L(
                "Выберите сотрудника и измените дни и часы его личного приёма.",
                "Кызматкерди тандап, анын кабыл алуу күндөрүн жана саатарын өзгөртүңүз."
              )
            : L(
                "Дни и часы личного приёма, используемые при записи граждан.",
                "Жарандарды жазуу үчүн колдонулган кабыл алуу күндөрү жана саатары."
              )
        }
      />
      {isAdmin ? (
        <AdminSchedulePicker isKy={isKy} />
      ) : currentUser?.targetId ? (
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
