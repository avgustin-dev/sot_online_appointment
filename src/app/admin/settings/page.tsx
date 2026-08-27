"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  formatDateList,
  generateDaySlots,
  parseDateList,
} from "@/lib/slots";
import { Save } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Collapsible } from "@/components/ui/Collapsible";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { state, currentUser, updateCalendar } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";
  const cal = state.calendar;
  const [slot, setSlot] = useState(cal.slotDurationMinutes);
  const [brk, setBrk] = useState(cal.breakMinutes);
  const [horizon, setHorizon] = useState(cal.bookingHorizonDays);
  const [closed, setClosed] = useState(formatDateList(cal.closedDates));
  const [extra, setExtra] = useState(formatDateList(cal.extraOpenDates));
  const [rules, setRules] = useState(cal.rulesText);
  const [msg, setMsg] = useState("");

  // Подтягиваем график из стора только один раз при заходе на страницу —
  // иначе любое несвязанное обновление стора (например, в другой вкладке)
  // затирало бы то, что оператор уже успел напечатать в форме.
  const [loadedOnce, setLoadedOnce] = useState(false);
  useEffect(() => {
    if (loadedOnce) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- разовая подгрузка формы после гидратации стора
    setSlot(cal.slotDurationMinutes);
    setBrk(cal.breakMinutes);
    setHorizon(cal.bookingHorizonDays);
    setClosed(formatDateList(cal.closedDates));
    setExtra(formatDateList(cal.extraOpenDates));
    setRules(cal.rulesText);
    setLoadedOnce(true);
  }, [cal, loadedOnce]);

  const canEdit =
    currentUser && ["admin", "reception"].includes(currentUser.role);

  const preview = useMemo(
    () =>
      generateDaySlots({
        ...cal,
        slotDurationMinutes: slot,
        breakMinutes: brk,
      }),
    [cal, slot, brk]
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const res = await updateCalendar({
      slotDurationMinutes: slot,
      breakMinutes: brk,
      bookingHorizonDays: horizon,
      closedDates: parseDateList(closed),
      extraOpenDates: parseDateList(extra),
      rulesText: rules,
    });
    if (res && "ok" in res && !res.ok) {
      setMsg(res.error);
      return;
    }
    setMsg(
      isKy
        ? "Параметрлер сакталды."
        : "Параметры записи сохранены."
    );
  }

  return (
    <div className="page-enter space-y-5">
      <Breadcrumbs
        items={[
          { label: t.crumbs.admin, href: "/admin" },
          { label: t.crumbs.settings },
        ]}
      />
      <div>
        <h1 className="section-title">
          {isKy ? "Жазылуу параметрлери" : "Параметры записи"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isKy
            ? "Слоттун узактыгы, тыныгуу, горизонт жана жабык күндөр. Жеке кабыл алуу графиги (күндөр/саат) — «Графиктер» бөлүмүндө. Дата: кк.аа.жжжж"
            : "Длительность слота, пауза, горизонт записи и закрытые даты — общие для платформы. Личный график приёма (дни/часы) каждого сотрудника — в разделе «Графики». Даты указываются как дд.мм.гггг."}
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      )}

      <form onSubmit={onSave} className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            {isKy ? "Слот жана горизонт" : "Слот и горизонт записи"}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                {isKy ? "Слот (мүн)" : "Длительность слота (мин)"}
              </label>
              <input
                type="number"
                min={10}
                max={60}
                className="input"
                value={slot}
                onChange={(e) => setSlot(Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="label">
                {isKy ? "Тыныгуу (мүн)" : "Пауза между слотами (мин)"}
              </label>
              <input
                type="number"
                min={0}
                max={30}
                className="input"
                value={brk}
                onChange={(e) => setBrk(Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div>
            <label className="label">
              {isKy
                ? "Жазылуу горизонту (күн)"
                : "Горизонт записи (дней вперёд)"}
            </label>
            <input
              type="number"
              min={7}
              max={120}
              className="input"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              disabled={!canEdit}
            />
          </div>

          <div>
            <label className="label">
              {isKy
                ? "Жабык күндөр (кк.аа.жжжж, үтүр менен)"
                : "Закрытые даты (дд.мм.гггг через запятую)"}
            </label>
            <input
              className="input font-mono text-sm"
              value={closed}
              onChange={(e) => setClosed(e.target.value)}
              disabled={!canEdit}
              placeholder="01.05.2026, 31.08.2026"
              lang="ru"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {isKy
                ? "Формат: 01.05.2026 — ISO (2026-05-01) эмес."
                : "Формат КР: 01.05.2026. Не используйте гггг-мм-дд."}
            </p>
          </div>
          <div>
            <label className="label">
              {isKy
                ? "Кошумча ачык күндөр (кк.аа.жжжж)"
                : "Доп. открытые даты (дд.мм.гггг)"}
            </label>
            <input
              className="input font-mono text-sm"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              disabled={!canEdit}
              placeholder="15.06.2026"
              lang="ru"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              {isKy ? "Слоттордун көрүнүшү" : "Предпросмотр интервалов"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isKy
                ? "Мисал: 08:00–08:20, 08:25–08:45 (24 саат)"
                : "Пример: 08:00–08:20, 08:25–08:45 (формат 24 часа)"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.map((s) => (
                <span
                  key={s.start}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs tabular-nums text-slate-800"
                >
                  {s.label}
                </span>
              ))}
              {preview.length === 0 && (
                <span className="text-sm text-slate-400">
                  {isKy
                    ? "Убакыт терезеси туура эмес"
                    : "Некорректное окно времени"}
                </span>
              )}
            </div>
          </div>

          <Collapsible
            title={
              isKy
                ? "Кошумча текст (график)"
                : "Дополнительный текст к графику"
            }
            subtitle={
              isKy
                ? "Негизги эрежелер — «Контент сервиса»"
                : "Основные правила — в разделе «Контент сервиса»"
            }
            defaultOpen={false}
          >
            <textarea
              className="input min-h-[160px] font-sans text-sm"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              disabled={!canEdit}
            />
          </Collapsible>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={!canEdit}
            >
              <Save className="h-4 w-4" />
              {isKy ? "Сактоо" : "Сохранить"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
