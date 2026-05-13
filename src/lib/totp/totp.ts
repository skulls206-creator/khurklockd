// ── Khurklockd TOTP Engine ──────────────────────────────────────
// RFC 6238 / RFC 4226 compliant time-based one-time password
// generation and verification. Uses Web Crypto API for all HMAC ops.

import { TOTPConfig } from "@/types";

// ── Base32 Decoding (RFC 4648) ─────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decode an RFC 4648 base32 string to a Uint8Array.
 * Handles lowercase, spaces, hyphens, and padding (=).
 *
 * @param base32 - Base32-encoded string (e.g. "JBSWY3DPEHPK3PXP")
 * @returns Decoded byte array
 * @throws If the string contains invalid base32 characters
 */
export function base32ToBytes(base32: string): Uint8Array {
  // Normalize: uppercase, strip whitespace, hyphens, and padding
  const normalized = base32
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "");

  if (normalized.length === 0) {
    return new Uint8Array(0);
  }

  const bits: number[] = [];
  let bitBuffer = 0;
  let bitsInBuffer = 0;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(
        `Invalid base32 character "${char}" at position ${i}`,
      );
    }

    bitBuffer = (bitBuffer << 5) | value;
    bitsInBuffer += 5;

    while (bitsInBuffer >= 8) {
      bitsInBuffer -= 8;
      bits.push((bitBuffer >>> bitsInBuffer) & 0xff);
    }
  }

  // Any remaining bits are padding and should be ignored per RFC 4648
  return new Uint8Array(bits);
}

// ── TOTP Core ──────────────────────────────────────────────────

type TOTPAlgorithm = "SHA-1" | "SHA-256" | "SHA-512";

/**
 * Generate a TOTP code per RFC 6238.
 *
 * @param secret - Raw secret key bytes (e.g. from base32ToBytes)
 * @param period - Time step in seconds (default 30)
 * @param digits - Number of digits in output code (default 6)
 * @param algorithm - HMAC hash algorithm (default "SHA-1")
 * @returns Zero-padded TOTP code string
 */
export async function generateTOTP(
  secret: Uint8Array,
  period: number = 30,
  digits: number = 6,
  algorithm: TOTPAlgorithm = "SHA-1",
): Promise<string> {
  if (secret.length === 0) {
    throw new Error("TOTP secret must not be empty");
  }

  if (period < 1) {
    throw new Error("TOTP period must be >= 1");
  }

  if (digits < 6 || digits > 10) {
    throw new Error("TOTP digits must be between 6 and 10");
  }

  const counter = Math.floor(Date.now() / 1000 / period);
  const hotp = await computeHOTP(secret, counter, digits, algorithm);
  return hotp;
}

/**
 * Compute an HMAC-based One-Time Password per RFC 4226.
 *
 * @param secret - Raw secret key bytes
 * @param counter - 8-byte counter value
 * @param digits - Number of digits in output
 * @param algorithm - HMAC hash algorithm
 */
async function computeHOTP(
  secret: Uint8Array,
  counter: number,
  digits: number,
  algorithm: TOTPAlgorithm,
): Promise<string> {
  // Convert counter to 8-byte big-endian Uint8Array
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }

  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    "raw",
    secret as BufferSource,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"],
  );

  // Compute HMAC over counter bytes
  const hmacResult = await crypto.subtle.sign("HMAC", key, counterBytes as BufferSource);
  const hmac = new Uint8Array(hmacResult);

  // Dynamic truncation per RFC 4226 §5.3
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = binary % 10 ** digits;
  return String(code).padStart(digits, "0");
}

// ── Verification ───────────────────────────────────────────────

/**
 * Verify a TOTP token against the secret, checking current and
 * adjacent time steps (±1) to allow for clock skew.
 *
 * @param token - User-provided TOTP code to verify
 * @param secret - Raw secret key bytes
 * @param period - Time step in seconds (default 30)
 * @param digits - Number of digits in output code (default 6)
 * @param algorithm - HMAC hash algorithm (default "SHA-1")
 * @returns True if the token is valid for any of the 3 time steps
 */
export async function verifyTOTP(
  token: string,
  secret: Uint8Array,
  period: number = 30,
  digits: number = 6,
  algorithm: TOTPAlgorithm = "SHA-1",
): Promise<boolean> {
  if (secret.length === 0) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const baseCounter = Math.floor(now / period);

  // Check current step and ±1 adjacent steps for clock skew
  for (let offset = -1; offset <= 1; offset++) {
    const hotp = await computeHOTP(
      secret,
      baseCounter + offset,
      digits,
      algorithm,
    );
    if (hotp === token) {
      return true;
    }
  }

  return false;
}

// ── Countdown ──────────────────────────────────────────────────

/**
 * Get the number of seconds remaining until the next TOTP code refresh.
 *
 * @param period - Time step in seconds (default 30)
 * @returns Seconds remaining (0 to period-1)
 */
export function getRemainingSeconds(period: number = 30): number {
  const seconds = Math.floor(Date.now() / 1000);
  return period - (seconds % period);
}

// ── Convenience ────────────────────────────────────────────────

/**
 * Generate a TOTP code from a TOTPConfig object.
 */
export async function generateTOTPFromConfig(
  config: TOTPConfig,
): Promise<string> {
  const secret = base32ToBytes(config.secret);
  return generateTOTP(secret, config.period, config.digits, config.algorithm);
}

/**
 * Verify a TOTP token against a TOTPConfig object.
 */
export async function verifyTOTPFromConfig(
  token: string,
  config: TOTPConfig,
): Promise<boolean> {
  const secret = base32ToBytes(config.secret);
  return verifyTOTP(token, secret, config.period, config.digits, config.algorithm);
}
