"use client";

import type { ReactNode, HTMLAttributes } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-transparent text-text-secondary border-border",
  success: "bg-transparent text-success border-success/30",
  warning: "bg-transparent text-warning border-warning/30",
  danger: "bg-transparent text-danger border-danger/30",
  info: "bg-transparent text-info border-info/30",
};

export function Badge({
  variant = "default",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
