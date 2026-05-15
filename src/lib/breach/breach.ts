// ── Khurklockd Breach Monitoring ───────────────────────────────
// Pwned Passwords k-anonymity model: SHA-1 the password, send only
// the first 5 hex chars of the digest, and check the response locally
// for the remaining 35 hex chars. The full password never leaves the
// browser, and the server never sees the full hash.
//
// API docs: https://haveibeenpwned.com/API/v3#PwnedPasswords
//
// Note: this replaces the previous implementation that called the
// /breachedaccount/{email} endpoint with the raw user email — that
// endpoint requires a paid API key and does NOT use k-anonymity,
// which contradicted the documented privacy model. See
// docs/upstream-issues/002-hibp-k-anonymity-correctness.md.

import type { PasswordBreachResult } from "@/types";

const HIBP_PASSWORDS_API = "https://api.pwnedpasswords.com/range";
const RATE_LIMIT_DELAY_MS = 1500;

// ── SHA-1 Helper ───────────────────────────────────────────────

/**
 * Compute the SHA-1 hex digest of a string using the Web Crypto API.
 * Returns uppercase hex to match the HIBP response format directly.
 */
export async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// ── Pwned Passwords Range Lookup ───────────────────────────────

/**
 * Check whether a password has appeared in the Pwned Passwords corpus
 * using the k-anonymity model. Only the first 5 hex chars of the SHA-1
 * digest are sent over the wire; the suffix is compared locally.
 *
 * @param password - The plaintext password to check (never leaves the browser)
 * @returns Pwned flag, occurrence count, and the prefix that was sent
 */
export async function checkPasswordBreach(
  password: string,
): Promise<PasswordBreachResult> {
  if (!password) {
    throw new Error("Password is required");
  }

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`${HIBP_PASSWORDS_API}/${prefix}`, {
    method: "GET",
    headers: {
      // Add-Padding asks HIBP to return a constant-size payload so a
      // network observer cannot infer how popular the prefix is.
      "Add-Padding": "true",
    },
  });

  if (response.status === 429) {
    throw new Error("Pwned Passwords rate limit exceeded. Try again shortly.");
  }
  if (!response.ok) {
    throw new Error(
      `Pwned Passwords API error: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.text();
  let count = 0;
  let pwned = false;
  for (const line of body.split(/\r?\n/)) {
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const lineSuffix = line.slice(0, idx).trim().toUpperCase();
    if (lineSuffix !== suffix) continue;
    const parsed = Number.parseInt(line.slice(idx + 1).trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      count = parsed;
      pwned = true;
    }
    break;
  }

  return {
    prefix,
    pwned,
    count,
    checkedAt: new Date().toISOString(),
  };
}

// ── Vault Scanner ──────────────────────────────────────────────

export interface ScannedPassword {
  /** Vault item id whose password was scanned. */
  itemId: string;
  /** Human-friendly item name for display. */
  itemName: string;
}

export interface ItemBreachResult {
  itemId: string;
  itemName: string;
  pwned: boolean;
  /** Occurrence count in the HIBP corpus. */
  count: number;
  /** Error message if the lookup itself failed. */
  error?: string;
}

/**
 * Scan a set of vault item passwords against Pwned Passwords using
 * k-anonymity. Each scan sends only the first 5 hex chars of the
 * SHA-1 digest. A short delay is inserted between requests so the
 * scan stays well under the HIBP rate limit.
 */
export async function scanPasswords(
  entries: Array<ScannedPassword & { password: string }>,
): Promise<ItemBreachResult[]> {
  const out: ItemBreachResult[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (i > 0) await delay(RATE_LIMIT_DELAY_MS);

    try {
      const result = await checkPasswordBreach(entry.password);
      out.push({
        itemId: entry.itemId,
        itemName: entry.itemName,
        pwned: result.pwned,
        count: result.count,
      });
    } catch (err) {
      out.push({
        itemId: entry.itemId,
        itemName: entry.itemName,
        pwned: false,
        count: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return out;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
