import type { StaffUser } from "./types";

export type StaffProfile = Omit<StaffUser, "password">;

export function toStaffProfile(user: StaffUser): StaffProfile {
  const { password: _pw, ...profile } = user;
  return profile;
}

export function staffHomePath(
  _user: StaffProfile,
  _hasPending = false
): string {
  return "/admin";
}

export function isChairProfile(user: Pick<StaffProfile, "role" | "position">) {
  if (user.role !== "leadership" && user.role !== "admin") return false;
  return /председатель|төрага|торага/i.test(user.position);
}
