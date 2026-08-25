"use client";

/**
 * Локальное «напоминание» о записи гражданина — чтобы код и PIN не терялись,
 * если пользователь случайно закроет вкладку/браузер сразу после записи и не
 * успеет их сохранить. Заполняет поля кода/PIN на /appointment-status заранее.
 * Сохраняется на этом устройстве (localStorage), но не более того — это не
 * замена самому коду/PIN, которые остаются в талоне и уведомлении.
 */

const MY_BOOKING_KEY = "vs-kr-my-booking";

export type MyBookingRef = { code: string; pin: string };

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим / хранилище недоступно — не критично */
  }
}

export function saveMyBookingRef(ref: MyBookingRef) {
  if (typeof window === "undefined") return;
  writeJson(window.localStorage, MY_BOOKING_KEY, ref);
}

export function getMyBookingRef(): MyBookingRef | null {
  if (typeof window === "undefined") return null;
  return readJson<MyBookingRef>(window.localStorage, MY_BOOKING_KEY);
}

export function clearMyBookingRef() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MY_BOOKING_KEY);
}
