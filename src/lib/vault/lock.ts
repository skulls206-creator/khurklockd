// ── Khurklockd Lock Timer ────────────────────────────────────────
// Manages the auto-lock countdown. Resets on user activity.
// Uses a monotonic reference point so the remaining time is accurate
// even across visibility-change events.

// ── Module State ─────────────────────────────────────────────────

let lockTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** The absolute time (ms since epoch) when the vault will lock. */
let lockAtEpoch: number | null = null;

/** The configured timeout duration in milliseconds. */
let configuredTimeoutMs: number = 0;

/** The user-supplied callback to invoke on lock. */
let onLockCallback: (() => void) | null = null;

// ── Public API ───────────────────────────────────────────────────

/**
 * Start (or restart) the auto-lock timer.
 *
 * If a previous timer was running, it is cleared first. When the
 * timeout fires, `onLock` is called exactly once.
 *
 * @param timeoutMinutes - Minutes of inactivity before locking (0 = never lock)
 * @param onLock - Callback invoked when the timer fires
 */
export function startLockTimer(
  timeoutMinutes: number,
  onLock: () => void,
): void {
  clearLockTimer();

  if (timeoutMinutes <= 0) {
    return; // Never lock
  }

  onLockCallback = onLock;
  configuredTimeoutMs = timeoutMinutes * 60_000;
  lockAtEpoch = Date.now() + configuredTimeoutMs;
  scheduleTimer();
}

/**
 * Reset the lock timer on user interaction.
 *
 * Restarts the countdown from now. Safe to call even if no timer
 * is currently running (no-op).
 */
export function resetLockTimer(): void {
  if (lockAtEpoch === null || onLockCallback === null) {
    return;
  }

  // Clear the existing scheduled timeout
  if (lockTimeoutId !== null) {
    clearTimeout(lockTimeoutId);
    lockTimeoutId = null;
  }

  // Re-arm: new absolute lock time = now + configured duration
  lockAtEpoch = Date.now() + configuredTimeoutMs;
  scheduleTimer();
}

// ── Internal ─────────────────────────────────────────────────────

function scheduleTimer(): void {
  if (lockAtEpoch === null || onLockCallback === null) {
    return;
  }

  const delay = Math.max(0, lockAtEpoch - Date.now());

  lockTimeoutId = setTimeout(() => {
    lockTimeoutId = null;
    lockAtEpoch = null;
    const cb = onLockCallback;
    onLockCallback = null;
    if (cb) {
      cb();
    }
  }, delay);
}

/**
 * Clear the lock timer and reset all associated state.
 * Safe to call regardless of timer state.
 */
export function clearLockTimer(): void {
  if (lockTimeoutId !== null) {
    clearTimeout(lockTimeoutId);
    lockTimeoutId = null;
  }
  lockAtEpoch = null;
  onLockCallback = null;
  configuredTimeoutMs = 0;
}

/**
 * Get the remaining time until auto-lock in seconds.
 *
 * @returns Seconds remaining, or -1 if no timer is running
 */
export function getRemainingLockTime(): number {
  if (lockAtEpoch === null) {
    return -1;
  }

  const remaining = Math.max(0, lockAtEpoch - Date.now());
  return Math.ceil(remaining / 1000);
}
