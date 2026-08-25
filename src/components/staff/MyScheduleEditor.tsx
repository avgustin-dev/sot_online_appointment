"use client";

import { useEffect, useState } from "react";
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
 * Правка собственного окна приёма (weekdays/startMinutes/endMinutes) для
 * Председателя/Зампреда — только своя запись в content.leadership, без
 * доступа к остальному контенту (см. StaffCmsController.patchLeadershipSchedule).
 */
export function MyScheduleEditor({ isKy }: { isKy?: boolean }) {
  const { currentUser, state, patchLeadershipSchedule } = useStore();
  const L = (ru: string, ky: string) => (isKy ? ky : ru);

  const targetId = currentUser?.targetId;
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

  useEffect(() => {
    if (!current) return;
    setWeekdays(current.weekdays);
    setStartTime(minutesToTime(current.startMinutes));
    setEndTime(minutesToTime(current.endMinutes));
  }, [current?.id, current?.weekdays, current?.startMinutes, current?.endMinutes]);

  if (!targetId) return null;

  function toggleDay(id: number) {
    setWeekdays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id].sort()
    );
  }

  async function onSave() {
    if (!targetId) return;
    if (weekdays.length === 0) {
      setErr(true);
      setMsg(L("Выберите хотя бы один день.", "Жок дегенде бир күндү тандаңыз."));
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
        {L("Мой график приёма", "Кабыл алуу графигим")}
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
                onClick={() => toggleDay(d.id)}
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
      </div>
    </section>
  );
}
