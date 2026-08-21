import type { StaffUser } from "./types";

export type StaffProfile = Omit<StaffUser, "password">;

export function toStaffProfile(user: StaffUser): StaffProfile {
  const { password: _pw, ...profile } = user;
  return profile;
}

export function staffHomePath(user: StaffProfile, hasPending = false): string {
  if (user.role === "intake") return "/admin/intake";
  if (user.role === "admin") return "/admin";
  if (user.role === "responsible") return "/admin/control";
  if (user.role === "leadership") return "/admin/reception";
  if (user.role === "reception" && hasPending) return "/admin/inbox";
  return "/admin";
}

export function isChairProfile(user: Pick<StaffProfile, "role" | "position">) {
  if (user.role !== "leadership" && user.role !== "admin") return false;
  return /председатель|төрага|торага/i.test(user.position);
}
