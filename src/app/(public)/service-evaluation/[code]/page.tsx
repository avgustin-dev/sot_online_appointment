"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FEEDBACK_QUESTIONS } from "@/lib/constants";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageLoader } from "@/components/ui/PageLoader";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export default function FeedbackByCodePage() {
  const params = useParams();
  const code = String(params.code || "").toUpperCase();
  const { ready, getAppealByCode, submitFeedback, lookupByCode } = useStore();
  const { t, lang } = useI18n();
  const isKy = lang === "ky";

  useEffect(() => {
    if (!ready || !code) return;
    void lookupByCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, code]);

  const appeal = getAppealByCode(code);

  const [scores, setScores] = useState<Record<string, number>>({
    respectful: 0,
    clearNextSteps: 0,
    convenient: 0,
    deadlinesMet: 0,
  });
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!appeal?.feedback) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- подгрузка уже отправленной оценки при открытии страницы
    setScores({
      respectful: appeal.feedback.respectful,
      clearNextSteps: appeal.feedback.clearNextSteps,
      convenient: appeal.feedback.convenient,
      deadlinesMet: appeal.feedback.deadlinesMet,
    });
    setComment(appeal.feedback.comment || "");
  }, [appeal?.id, appeal?.feedback?.submittedAt]);

  if (!ready) return <PageLoader label={t.common.loading} />;

  if (!appeal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-court-ink">
            {isKy ? "Кайрылуу табылган жок" : "Обращение не найдено"}
          </h1>
          <p className="mt-2 text-sm text-court-muted">
            {isKy
              ? "Кодду текшериңиз же «Менин жазылууум» аркылуу кириңиз."
              : "Проверьте код или откройте раздел «Моя запись»."}
          </p>
          <Link href={routes.appointmentStatus} className="btn-primary mt-4 inline-flex">
            {t.nav.myAppointment}
          </Link>
        </div>
      </div>
    );
  }

  const stageOk = [
    "answered",
    "closed",
    "in_control",
    "reception_done",
  ].includes(appeal.stage);

  /** Оценка онлайн-записи доступна всегда при найденной записи; полный цикл — после приёма */
  const bookingOnly = !stageOk;

  if ((appeal.feedback || done) && !editing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="card p-6 text-center">
          <h1 className="text-xl font-semibold text-court-ink">
            {t.feedback.thanks}
          </h1>
          <p className="mt-2 text-sm text-court-muted">
            {isKy
              ? "Сиздин баалоо кабыл алынды. Керек болсо өзгөртө аласыз."
              : "Ваша оценка принята. При необходимости Вы можете её изменить."}
          </p>
          {appeal.feedback && (
            <p className="mt-2 text-xs text-slate-500">
              {isKy ? "Жөнөтүлгөн" : "Направлено"}:{" "}
              {new Date(appeal.feedback.submittedAt).toLocaleString("ru-RU")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setDone(false);
                setEditing(true);
              }}
            >
              {isKy ? "Баалоону өзгөртүү" : "Изменить оценку"}
            </button>
            <Link href="/" className="btn-outline">
              {t.book.toHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    for (const q of FEEDBACK_QUESTIONS) {
      if (!scores[q.key] || scores[q.key] < 1) {
        setError(
          isKy
            ? "Бардык суроолорго жооп бериңиз (1–5)."
            : "Ответьте на все вопросы (оценка 1–5)."
        );
        return;
      }
    }
    const res = await submitFeedback(code, {
      respectful: scores.respectful,
      clearNextSteps: scores.clearNextSteps,
      convenient: scores.convenient,
      deadlinesMet: scores.deadlinesMet,
      comment: comment.trim() || undefined,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(false);
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-10">
      <Breadcrumbs
        items={[
          { label: t.crumbs.home, href: "/" },
          { label: t.crumbs.feedback },
          { label: code },
        ]}
      />
      <form onSubmit={onSubmit} className="card p-5 sm:p-6">
        <h1 className="text-xl font-semibold text-court-ink">
          {editing
            ? isKy
              ? "Баалоону өзгөртүү"
              : "Изменение оценки"
            : t.feedback.title}
        </h1>
        <p className="mt-1 text-sm text-court-muted">
          {appeal.fullName} · {code}
        </p>
        {bookingOnly && (
          <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            {isKy
              ? "Кабыл алуу азырынча өтө элек — сиз негизинен электрондук жазылуунун ыңгайлуулугун баалай аласыз."
              : "Личный приём ещё не проведён: Вы можете оценить удобство электронной записи; после приёма — дополнить оценку."}
          </p>
        )}

        <div className="mt-6 space-y-5">
          {FEEDBACK_QUESTIONS.map((q) => (
            <div key={q.key}>
              <div className="mb-2 text-sm font-medium text-court-ink">
                {isKy ? q.labelKy || q.label : q.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [q.key]: n }))}
                    className={
                      scores[q.key] === n
                        ? "min-w-[2.5rem] border border-court-navy bg-court-navy px-3 py-2 text-sm font-semibold text-white"
                        : "min-w-[2.5rem] border border-court-line bg-white px-3 py-2 text-sm text-court-ink hover:border-court-navy"
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <label className="label" htmlFor="comment">
            {t.feedback.comment}
          </label>
          <textarea
            id="comment"
            className="input min-h-[88px] resize-y"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-4 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            {editing
              ? isKy
                ? "Өзгөртүүлөрдү сактоо"
                : "Сохранить изменения"
              : t.feedback.submit}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setEditing(false)}
            >
              {isKy ? "Жокко" : "Отмена"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
