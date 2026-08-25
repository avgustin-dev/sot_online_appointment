"use client";

import { usePathname } from "next/navigation";
import { StaffShell } from "@/components/layout/StaffShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  return <StaffShell>{children}</StaffShell>;
}
