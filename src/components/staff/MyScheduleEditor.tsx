"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useStore } from "@/lib/store";
import { minutesToTime, timeToMinutes } from "@/lib/slots";
import { targetPerson } from "@/lib/targets";

const WEEKDAYS: { id: number; ru: string; ky: string }[] = [
  { id: 1, ru: "Пн", ky: "Дш" },
  { id: 2, ru: "Вт", ky: "Шш" },
  { id: 3, ru: "Ср", ky: "Шр" },
  { id: 4, ru: "Чт", ky: "Бш" },
  { id: 5, ru: "Пт", ky: "Жм" },
  { id: 6, ru: "Сб", ky: "Иш" },
  { id: 0, ru: "Вс", ky: "Жк" },
];

/**
 * Правка окна приёма (weekdays/startMinutes/endMinutes) для одной записи
 * content.leadership — единственного источника графика, который потом как
 * есть выводится в публичной части (CourtContactsBlock).
 *
 * Без targetId — это «Мой график»: правит только сам сотрудник, свою запись
 * (см. patchLeadershipSchedule в storeLocal.ts). С targetId — режим админа:
 * тот же компонент, но для выбранного им лица (см. /admin/my-schedule).
 */
export function MyScheduleEditor({
  isKy,
  targetId: targetIdProp,
}: {
  isKy?: boolean;
  targetId?: string;
}) {
  const { currentUser, state, patchLeadershipSchedule } = useStore();
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const targetId = targetIdProp ?? currentUser?.targetId;
  const person = targetId ? targetPerson(targetId, isKy, state.serviceContent) : null;
  const current = state.serviceContent.leadership.find((p) => p.id === targetId);

  const [weekdays, setWeekdays] = useState<number[]>(current?.weekdays ?? []);
  const [startTime, setStartTime] = useState(
    minutesToTime(current?.startMinutes ?? 540)
  );
  const [endTime, setEndTime] = useState(minutesToTime(current?.endMinutes ?? 720));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  // Подтягиваем сохранённый график только один раз при заходе на страницу —
  // иначе сохранение в соседней вкладке (например, в CMS «Сайт») перезатёрло
  // бы то, что оператор уже успел напечатать здесь.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!current || loadedFor === current.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- разовая подгрузка формы после гидратации стора
    setWeekdays(current.weekdays);
    setStartTime(minutesToTime(current.startMinutes));
    setEndTime(minutesToTime(current.endMinutes));
    setLoadedFor(current.id);
  }, [current, loadedFor]);

  if (!targetId) return null;

  function selectDay(id: number) {
    setWeekdays([id]);
  }

  async function onSave() {
    if (!targetId) return;
    if (weekdays.length === 0) {
      setErr(true);
      setMsg(L("Выберите день приёма.", "Кабыл алуу күнүн тандаңыз."));
      return;
    }
    setBusy(true);
    const res = await patchLeadershipSchedule(targetId, {
      weekdays,
      startMinutes: timeToMinutes(startTime),
      endMinutes: timeToMinutes(endTime),
    });
    setBusy(false);
    setErr(!res.ok);
    setMsg(
      res.ok
        ? L("График сохранён.", "График сакталды.")
        : "error" in res
          ? res.error
          : ""
    );
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-court-navy">
        {targetIdProp
          ? L("График приёма", "Кабыл алуу графиги")
          : L("Мой график приёма", "Кабыл алуу графигим")}
      </h2>
      {person && (
        <p className="mb-4 text-sm text-court-muted">
          {person.fullName} — {person.position}
        </p>
      )}
      <div className="space-y-4">
        <div>
          <span className="label">{L("Дни приёма", "Кабыл алуу күндөрү")}</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={weekdays.includes(d.id)}
                onClick={() => selectDay(d.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  weekdays.includes(d.id)
                    ? "border-court-navy bg-court-navy text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {isKy ? d.ky : d.ru}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{L("Начало приёма", "Башталышы")}</label>
            <input
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{L("Окончание приёма", "Аяктоосу")}</label>
            <input
              type="time"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        {msg && (
          <p className={`text-sm ${err ? "text-rose-700" : "text-emerald-700"}`}>
            {msg}
          </p>
        )}
        <button
          type="button"
          className="btn-primary !text-sm"
          disabled={busy}
          onClick={onSave}
        >
          {L("Сохранить график", "Графикти сактоо")}
        </button>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="label">
              {L("Сохранённый график", "Сакталган график")}
            </span>
            {current && current.weekdays.length > 0 && (
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {L(
                  "синхронизировано с публичной частью",
                  "коомдук бөлүк менен синхрондолгон"
                )}
              </Link>
            )}
          </div>
          {current && current.weekdays.length > 0 ? (
            <p className="mt-1 text-sm font-medium text-court-navy">
              {current.weekdays
                .map(
                  (d) => WEEKDAYS.find((w) => w.id === d)?.[isKy ? "ky" : "ru"] ?? d
                )
                .join(", ")}
              {" · "}
              {minutesToTime(current.startMinutes)}–
              {minutesToTime(current.endMinutes)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-court-muted">
              {L("График ещё не сохранён.", "График али сакталган эмес.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
