"use client";

import { formatKgPhone, KG_PHONE_PLACEHOLDER, isCompleteKgPhone } from "@/lib/phoneMask";
import { cn } from "@/lib/utils";

export function PhoneInput({
  value,
  onChange,
  required,
  className,
  id,
  autoComplete = "tel",
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  autoComplete?: string;
}) {
  function handleChange(raw: string) {
    onChange(formatKgPhone(raw, required || raw.replace(/\D/g, "").length > 0));
  }

  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete={autoComplete}
      required={required}
      aria-invalid={required && value.length > 0 && !isCompleteKgPhone(value)}
      className={cn("input font-mono tracking-wide", className)}
      value={value}
      placeholder={KG_PHONE_PLACEHOLDER}
      onFocus={() => {
        if (!value.trim()) onChange(formatKgPhone("", true));
      }}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== "Backspace" && e.key !== "Delete") return;
        const d = e.currentTarget.value.replace(/\D/g, "");
        if (d.length <= 3) {
          if (!required) {
            e.preventDefault();
            onChange("");
          } else {
            e.preventDefault();
          }
        }
      }}
    />
  );
}
