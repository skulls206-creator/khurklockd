// ── Khurklockd Breach Monitoring ───────────────────────────────
// HaveIBeenPwned API v3 integration for checking whether vault
// accounts have appeared in known data breaches.
//
// API docs: https://haveibeenpwned.com/API/v3

import { BreachResult, BreachDetail } from "@/types";

const HIBP_API_BASE = "https://haveibeenpwned.com/api/v3";
const HIBP_USER_AGENT = "khurklockd-password-manager/1.0";
const RATE_LIMIT_DELAY_MS = 1600; // ~1.6s between requests to stay under rate limit

// ── SHA-1 Helpers ──────────────────────────────────────────────

/**
 * Compute the SHA-1 hex digest of a string using the Web Crypto API.
 *
 * @param input - String to hash
 * @returns Lowercase hex-encoded SHA-1 digest
 */
export async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── HIBP API Client ────────────────────────────────────────────

/**
 * Check whether an email address or username has appeared in known
 * data breaches via the HaveIBeenPwned API v3.
 *
 * Uses the breachedaccount endpoint directly (not k-anonymity, which
 * is for passwords, not accounts). Respects rate limits with a delay.
 *
 * @param emailOrUsername - Email address or username to check
 * @returns BreachResult with breach details if found
 */
export async function checkBreach(
  emailOrUsername: string,
): Promise<BreachResult> {
  const query = emailOrUsername.trim().toLowerCase();

  if (!query) {
    return {
      query: emailOrUsername,
      found: false,
      breaches: [],
      checkedAt: new Date().toISOString(),
    };
  }

  const url = `${HIBP_API_BASE}/breachedaccount/${encodeURIComponent(query)}`;

  // Add ?truncateResponse=false to get full breach details
  const fullUrl = `${url}?truncateResponse=false`;

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "User-Agent": HIBP_USER_AGENT,
        Accept: "application/json",
      },
    });

    // 404 means the account was not found in any breaches
    if (response.status === 404) {
      return {
        query: emailOrUsername,
        found: false,
        breaches: [],
        checkedAt: new Date().toISOString(),
      };
    }

    // 429 rate limit — caller should retry
    if (response.status === 429) {
      throw new Error(
        "HIBP rate limit exceeded. Try again later.",
      );
    }

    if (!response.ok) {
      throw new Error(
        `HIBP API error: ${response.status} ${response.statusText}`,
      );
    }

    const rawBreaches: unknown = await response.json();

    if (!Array.isArray(rawBreaches)) {
      throw new Error("Unexpected HIBP API response format");
    }

    const breaches: BreachDetail[] = rawBreaches.map(
      (raw: Record<string, unknown>) => ({
        name: String(raw.Name ?? ""),
        domain: String(raw.Domain ?? ""),
        breachDate: String(raw.BreachDate ?? ""),
        addedDate: String(raw.AddedDate ?? ""),
        dataClasses: Array.isArray(raw.DataClasses)
          ? raw.DataClasses.map(String)
          : [],
        description: String(raw.Description ?? ""),
        isVerified: Boolean(raw.IsVerified),
        isSensitive: Boolean(raw.IsSensitive),
        pwnCount: typeof raw.PwnCount === "number" ? raw.PwnCount : 0,
      }),
    );

    return {
      query: emailOrUsername,
      found: breaches.length > 0,
      breaches,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Re-throw HIBP-specific errors; wrap network errors
    if (error instanceof Error) {
      if (error.message.startsWith("HIBP")) {
        throw error;
      }
      throw new Error(`HIBP request failed: ${error.message}`);
    }
    throw new Error("HIBP request failed: unknown error");
  }
}

// ── Vault Scanner ──────────────────────────────────────────────

/**
 * Scan multiple email addresses/accounts against HaveIBeenPwned.
 * Checks sequentially with a rate-limit delay between each request.
 *
 * @param emails - Array of email addresses or usernames to check
 * @returns Map of email → BreachResult
 */
export async function scanVault(
  emails: string[],
): Promise<Map<string, BreachResult[]>> {
  const results = new Map<string, BreachResult[]>();

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    // Apply rate-limit delay before each request (except the first)
    if (i > 0) {
      await delay(RATE_LIMIT_DELAY_MS);
    }

    try {
      const result = await checkBreach(email);
      // Store grouped by email — each email maps to an array of
      // BreachResult objects (always a single-element array in
      // the current impl, but the Map type allows merging later).
      results.set(email, [result]);
    } catch (error) {
      // On failure, record the error but continue scanning
      results.set(email, [
        {
          query: email,
          found: false,
          breaches: [],
          checkedAt: new Date().toISOString(),
        },
      ]);
      console.error(`Breach check failed for "${email}":`, error);
    }
  }

  return results;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Promise-based delay helper.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a BreachResult indicates a serious breach.
 * "Serious" means verified + sensitive data classes exposed,
 * or a very high pwn count (> 10 million).
 */
export function isSeriousBreach(result: BreachResult): boolean {
  if (!result.found) return false;
  return result.breaches.some((b) => {
    const hasSensitiveData = b.isSensitive && b.isVerified;
    const highPwnCount = b.pwnCount > 10_000_000;
    return hasSensitiveData || highPwnCount;
  });
}

/**
 * Extract unique breach names from a map of results.
 */
export function getUniqueBreaches(
  results: Map<string, BreachResult[]>,
): string[] {
  const names = new Set<string>();
  for (const [, breachResults] of results) {
    for (const result of breachResults) {
      for (const breach of result.breaches) {
        names.add(breach.name);
      }
    }
  }
  return Array.from(names).sort();
}
