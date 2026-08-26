"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminChromeValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
};

const AdminChromeContext = createContext<AdminChromeValue | null>(null);

const SIDEBAR_KEY = "admin-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminChromeProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    if (readCollapsed()) setSidebarCollapsedState(true);
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
    }),
    [sidebarCollapsed, setSidebarCollapsed, toggleSidebar]
  );

  return (
    <AdminChromeContext.Provider value={value}>
      {children}
    </AdminChromeContext.Provider>
  );
}

export function useAdminChrome() {
  const ctx = useContext(AdminChromeContext);
  if (!ctx) {
    throw new Error("useAdminChrome must be used within AdminChromeProvider");
  }
  return ctx;
}
