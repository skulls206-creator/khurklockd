"use client";

import type { ReactNode, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  padding?: boolean;
  hover?: boolean;
}

export function Card({
  header,
  padding = true,
  hover = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-border bg-surface",
        hover
          ? "transition-all duration-150 hover:border-border-strong hover:bg-surface-hover cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {header && (
        <div className="px-5 py-4 border-b border-border">
          {typeof header === "string" ? (
            <h3 className="text-sm font-semibold text-text-primary">
              {header}
            </h3>
          ) : (
            header
          )}
        </div>
      )}

      {padding ? <div className="p-5">{children}</div> : children}
    </div>
  );
}

export default Card;
