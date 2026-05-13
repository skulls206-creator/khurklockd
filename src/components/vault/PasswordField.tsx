"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClipboard } from "@/hooks/useClipboard";
import { calculateStrength } from "@/lib/generator";

export interface PasswordFieldProps {
  value: string;
  label?: string;
  /** Auto-hide delay in ms (default 30000, i.e. 30s). 0 to never auto-hide. */
  autoHideMs?: number;
  /** Show strength meter. Default true. */
  showStrength?: boolean;
}

export function PasswordField({
  value,
  label,
  autoHideMs = 30_000,
  showStrength = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const { copy, copied } = useClipboard({ clearAfterMs: 30_000 });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const strength = showStrength ? calculateStrength(value) : null;

  const handleShow = useCallback(() => {
    setVisible(true);

    // Clear any existing auto-hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Auto-hide after delay
    if (autoHideMs > 0) {
      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, autoHideMs);
    }
  }, [autoHideMs]);

  const handleHide = useCallback(() => {
    setVisible(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {label}
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 font-password text-sm bg-bg-primary border border-border rounded-md px-3 py-2 truncate">
          {visible ? value : "\u2022".repeat(Math.min(value.length, 24))}
        </div>

        <button
          type="button"
          onClick={visible ? handleHide : handleShow}
          aria-label={visible ? "Hide password" : "Show password"}
          className={[
            "p-2 rounded-md text-text-muted hover:text-text-primary",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          ].join(" ")}
        >
          {visible ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-6 0m6 0a3 3 0 01-6 0m0 0l6 6M4 4l16 16" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => copy(value)}
          aria-label="Copy to clipboard"
          className={[
            "p-2 rounded-md transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            copied
              ? "text-success bg-success-muted"
              : "text-text-muted hover:text-text-primary",
          ].join(" ")}
        >
          {copied ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          )}
        </button>
      </div>

      {/* Strength meter */}
      {showStrength && strength && (
        <div className="space-y-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4} aria-label={`Password strength: ${strength.label}`}>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={[
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  level <= strength.score
                    ? "bg-current"
                    : "bg-surface-hover",
                ].join(" ")}
                style={{
                  color:
                    level <= strength.score ? strength.color : undefined,
                }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: strength.color }}>
            {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}

export default PasswordField;
