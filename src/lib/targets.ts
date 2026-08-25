import { mergeServiceContent } from "./serviceContent";
import type { CalendarSettings, LeadershipPerson, ServiceContent } from "./types";

/**
 * Окно приёма конкретного лица (график sot.kg).
 * "calendar" — общие дни/часы из настроек платформы (приёмная, иной зам.).
 */
export type TargetWindow =
  | { kind: "fixed"; weekdays: number[]; startMinutes: number; endMinutes: number }
  | { kind: "calendar" };

export const TARGET_WINDOWS: Record<string, TargetWindow> = {
  chairman: {
    kind: "fixed",
    weekdays: [4],
    startMinutes: 9 * 60,
    endMinutes: 12 * 60,
  },
  deputy_bakirova: {
    kind: "fixed",
    weekdays: [2],
    startMinutes: 15 * 60,
    endMinutes: 16 * 60,
  },
  deputy_kamchybekov: {
    kind: "fixed",
    weekdays: [4],
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
  },
  deputy_other: { kind: "calendar" },
  reception: { kind: "calendar" },
};

function peopleOf(sc?: ServiceContent | null): LeadershipPerson[] {
  return mergeServiceContent(sc).leadership;
}

export function resolveTargetWindow(
  targetId: string,
  calendar: CalendarSettings,
  sc?: ServiceContent | null
): { weekdays: number[]; startMinutes: number; endMinutes: number } {
  const person = peopleOf(sc).find((p) => p.id === targetId);
  if (person) {
    if (person.windowKind === "calendar") {
      return {
        weekdays: calendar.receptionWeekdays,
        startMinutes: calendar.dayStartMinutes,
        endMinutes: calendar.dayEndMinutes,
      };
    }
    return {
      weekdays: person.weekdays?.length
        ? person.weekdays
        : calendar.receptionWeekdays,
      startMinutes: person.startMinutes ?? calendar.dayStartMinutes,
      endMinutes: person.endMinutes ?? calendar.dayEndMinutes,
    };
  }
  const w = TARGET_WINDOWS[targetId] ?? { kind: "calendar" as const };
  if (w.kind === "calendar") {
    return {
      weekdays: calendar.receptionWeekdays,
      startMinutes: calendar.dayStartMinutes,
      endMinutes: calendar.dayEndMinutes,
    };
  }
  return {
    weekdays: w.weekdays,
    startMinutes: w.startMinutes,
    endMinutes: w.endMinutes,
  };
}

export function bookableTargets(sc?: ServiceContent | null): LeadershipPerson[] {
  return peopleOf(sc).filter((p) => p.bookable);
}

export function targetLabel(id: string, isKy = false, sc?: ServiceContent | null): string {
  const row = peopleOf(sc).find((r) => r.id === id);
  if (!row) return id;
  return isKy
    ? row.bookLabelKy || row.fullNameKy || row.bookLabelRu
    : row.bookLabelRu || row.fullNameRu || row.bookLabelKy;
}

/** ФИО и должность лица, ведущего приём — для полной карточки заявки. */
export function targetPerson(
  id: string,
  isKy = false,
  sc?: ServiceContent | null
): { fullName: string; position: string } | null {
  const row = peopleOf(sc).find((r) => r.id === id);
  if (!row) return null;
  return {
    fullName: isKy ? row.fullNameKy || row.fullNameRu : row.fullNameRu || row.fullNameKy,
    position: isKy ? row.positionKy || row.positionRu : row.positionRu || row.positionKy,
  };
}

export function targetShort(id: string, isKy = false, sc?: ServiceContent | null): string {
  const row = peopleOf(sc).find((r) => r.id === id);
  if (!row) return id;
  return isKy
    ? row.shortKy || row.fullNameKy || row.shortRu
    : row.shortRu || row.fullNameRu || row.shortKy;
}
