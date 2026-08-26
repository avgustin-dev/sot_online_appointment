"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Модалка: portal поверх всего UI, затемнение фона,
 * скролл у оверлея (страница под ним не двигается — так и должно быть).
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-slate-900/55"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-start justify-center px-3 py-6 sm:items-center sm:px-6 sm:py-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-modal-title"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "my-auto w-full max-w-lg animate-[modalIn_180ms_ease-out] rounded-xl border border-slate-200 bg-white shadow-2xl",
            className
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id="admin-modal-title"
                className="text-base font-semibold text-slate-900 sm:text-lg"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className={cn(
              "px-5 py-4 pb-6 sm:px-6 sm:py-5 sm:pb-7",
              bodyClassName
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
