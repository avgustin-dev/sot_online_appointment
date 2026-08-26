"use client";

import { cn } from "@/lib/utils";

/** Обрезанный текст с «…» и полным содержимым при наведении. */
export function EllipsisText({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "div" | "p";
}) {
  if (!text) return <Tag className={className}>—</Tag>;
  return (
    <Tag
      className={cn("block min-w-0 max-w-full truncate", className)}
      title={text}
    >
      {text}
    </Tag>
  );
}
