"use client";

import { useCallback, useEffect, useState } from "react";
import { useVault } from "@/hooks/useVault";
import type { VaultState } from "@/types";

// ── State Visual Configuration ─────────────────────────────

interface LockStateConfig {
  icon: React.ReactNode;
  label: string;
  ringColor: string;
  bgColor: string;
  textColor: string;
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      {locked ? (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </>
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </>
      )}
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function getStateConfig(state: VaultState): LockStateConfig {
  switch (state) {
    case "uninitialized":
      return {
        icon: <LockIcon locked={true} />,
        label: "Not Created",
        ringColor: "ring-text-muted/30",
        bgColor: "bg-surface-hover",
        textColor: "text-text-muted",
      };
    case "locked":
      return {
        icon: <LockIcon locked={true} />,
        label: "Locked",
        ringColor: "ring-warning/30",
        bgColor: "bg-warning-muted",
        textColor: "text-warning",
      };
    case "unlocking":
      return {
        icon: <SpinnerIcon />,
        label: "Unlocking...",
        ringColor: "ring-accent/30",
        bgColor: "bg-accent-muted",
        textColor: "text-accent",
      };
    case "unlocked":
      return {
        icon: <LockIcon locked={false} />,
        label: "Unlocked",
        ringColor: "ring-success/30",
        bgColor: "bg-success-muted",
        textColor: "text-success",
      };
    case "error":
      return {
        icon: <ErrorIcon />,
        label: "Error",
        ringColor: "ring-danger/30",
        bgColor: "bg-danger-muted",
        textColor: "text-danger",
      };
  }
}

// ── Countdown Timer ────────────────────────────────────────

/**
 * Compute the remaining seconds until auto-lock based on the
 * configured lock timeout and the current elapsed time.
 *
 * Returns the number of seconds remaining, or `null` if auto-lock
 * is disabled (timeoutMinutes === 0) or vault isn't unlocked.
 */
function useLockCountdown(
  vaultState: VaultState,
  timeoutMinutes: number,
  unlockedAtRef: React.MutableRefObject<number | null>,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (vaultState !== "unlocked" || timeoutMinutes <= 0) {
      setRemaining(null);
      return;
    }

    // This effect runs when vaultState transitions to unlocked.
    // The `unlockedAtRef` is set by the parent to track when unlock happened.

    function tick() {
      if (unlockedAtRef.current === null) {
        setRemaining(null);
        return;
      }
      const elapsed = (Date.now() - unlockedAtRef.current) / 1000;
      const total = timeoutMinutes * 60;
      const left = Math.max(0, Math.round(total - elapsed));
      setRemaining(left);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [vaultState, timeoutMinutes, unlockedAtRef]);

  return remaining;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ── Props ──────────────────────────────────────────────────

export interface VaultLockStatusProps {
  /** Compact variant for header bars — smaller, no label text. */
  compact?: boolean;
  /** Whether to show the countdown timer. Default true. */
  showCountdown?: boolean;
}

// ── Component ──────────────────────────────────────────────

export function VaultLockStatus({
  compact = false,
  showCountdown = true,
}: VaultLockStatusProps) {
  const { vaultState, lockVault, settings, resetLockTimer } = useVault();
  const [unlockedAtRef] = useState<React.MutableRefObject<number | null>>(
    () => ({ current: null }),
  );

  // Track when vault transitions to unlocked
  useEffect(() => {
    if (vaultState === "unlocked") {
      unlockedAtRef.current = Date.now();
    } else {
      unlockedAtRef.current = null;
    }
  }, [vaultState, unlockedAtRef]);

  const timeoutMinutes = settings?.lockTimeoutMinutes ?? 5;
  const remaining = useLockCountdown(vaultState, timeoutMinutes, unlockedAtRef);
  const config = getStateConfig(vaultState);

  const handleLockClick = useCallback(() => {
    if (vaultState === "unlocked") {
      lockVault();
    }
  }, [vaultState, lockVault]);

  const handleResetTimer = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resetLockTimer();
      unlockedAtRef.current = Date.now();
    },
    [resetLockTimer, unlockedAtRef],
  );

  const isUnlocked = vaultState === "unlocked";

  // ── Compact Variant (header bar) ──────────────────────────

  if (compact) {
    return (
      <div
        className={[
          "relative flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          isUnlocked ? "cursor-pointer hover:opacity-80" : "",
          config.bgColor,
          config.textColor,
        ].join(" ")}
        onClick={isUnlocked ? handleLockClick : undefined}
        role="status"
        aria-live="polite"
        aria-label={`Vault ${config.label}${remaining !== null ? `, auto-lock in ${formatCountdown(remaining)}` : ""}`}
        title={
          isUnlocked && remaining !== null
            ? `Auto-lock in ${formatCountdown(remaining)} — click to lock`
            : `Vault is ${config.label}`
        }
      >
        {config.icon}
        {remaining !== null && showCountdown && (
          <span className="tabular-nums">{formatCountdown(remaining)}</span>
        )}
      </div>
    );
  }

  // ── Full Variant ──────────────────────────────────────────

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border border-border p-3",
        "transition-all duration-200",
        isUnlocked ? "cursor-pointer hover:border-border-strong" : "",
      ].join(" ")}
      onClick={isUnlocked ? handleLockClick : undefined}
      role="status"
      aria-live="polite"
      aria-label={`Vault status: ${config.label}`}
    >
      {/* State icon */}
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-full ring-2",
          config.ringColor,
          config.bgColor,
          config.textColor,
        ].join(" ")}
      >
        {config.icon}
      </div>

      {/* State label + countdown */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{config.label}</p>

        {remaining !== null && showCountdown && (
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-surface-hover overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all duration-1000 ease-linear"
                style={{
                  width: `${(remaining / (timeoutMinutes * 60)) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs tabular-nums text-text-muted">
              {formatCountdown(remaining)}
            </span>
          </div>
        )}

        {vaultState === "locked" && (
          <p className="text-xs text-text-muted mt-0.5">
            Unlock to access your vault
          </p>
        )}

        {vaultState === "uninitialized" && (
          <p className="text-xs text-text-muted mt-0.5">
            Create a vault to get started
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isUnlocked && (
          <>
            <button
              type="button"
              onClick={handleResetTimer}
              aria-label="Reset auto-lock timer"
              className={[
                "p-1.5 rounded-md transition-colors duration-150",
                "text-text-muted hover:text-text-primary hover:bg-surface-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              ].join(" ")}
              title="Reset auto-lock timer"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleLockClick}
              aria-label="Lock vault now"
              className={[
                "p-1.5 rounded-md transition-colors duration-150",
                "text-text-muted hover:text-warning hover:bg-warning-muted",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              ].join(" ")}
              title="Lock vault now (Ctrl+Shift+L)"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VaultLockStatus;
