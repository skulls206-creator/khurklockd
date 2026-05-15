// ── Khurklockd TOTP Key Import ─────────────────────────────────
// Parse otpauth:// URIs per Google Authenticator key URI format.
// Used for importing secrets from QR codes and setup links.

import { TOTPConfig } from "@/types";
import { base32ToBytes } from "./totp";

/** Result of parsing an otpauth:// URI. */
export interface ParsedOTPAuthURL {
  /** Raw secret as Uint8Array (already base32-decoded). */
  secret: Uint8Array;
  /** Account label (e.g. "user@example.com"). */
  label: string;
  /** Issuer name (e.g. "GitHub"). */
  issuer: string;
  /** Hash algorithm (SHA-1, SHA-256, SHA-512). */
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  /** Number of digits (6 or 8). */
  digits: 6 | 8;
  /** Time step period in seconds. */
  period: number;
}

/**
 * Parse an otpauth://totp/ URI into its constituent parts.
 *
 * Format: otpauth://totp/{label}?secret={secret}&issuer={issuer}[&algorithm={algo}][&digits={digits}][&period={period}]
 *
 * @param url - Full otpauth:// URI string
 * @returns Parsed TOTP configuration
 * @throws If the URL is not a valid otpauth://totp/ URI or the secret is missing
 *
 * @example
 * const parsed = parseOTPAuthURL("otpauth://totp/GitHub:alice?secret=JBSWY3DPEHPK3PXP&issuer=GitHub");
 */
export function parseOTPAuthURL(url: string): ParsedOTPAuthURL {
  if (!url.startsWith("otpauth://totp/")) {
    throw new Error(
      `Invalid OTP auth URL: must start with "otpauth://totp/", got "${url.slice(0, 30)}..."`,
    );
  }

  // Split into path and query parts
  const urlWithoutProtocol = url.slice("otpauth://totp/".length);
  const questionIndex = urlWithoutProtocol.indexOf("?");
  if (questionIndex === -1) {
    throw new Error("Invalid OTP auth URL: missing query parameters");
  }

  const labelPath = urlWithoutProtocol.slice(0, questionIndex);
  const queryString = urlWithoutProtocol.slice(questionIndex + 1);

  // Parse query parameters
  const params = new URLSearchParams(queryString);

  // Secret is required
  const secretRaw = params.get("secret");
  if (!secretRaw) {
    throw new Error("Invalid OTP auth URL: missing 'secret' parameter");
  }

  // URL-decode the secret (it may contain %2B for +, etc.)
  const secretDecoded = decodeURIComponent(secretRaw);
  const secret = base32ToBytes(secretDecoded);

  // Parse label — may include issuer prefix like "GitHub:alice"
  let label = decodeURIComponent(labelPath);
  let issuer = params.get("issuer")
    ? decodeURIComponent(params.get("issuer")!)
    : "";

  // If label has "issuer:account" format and no explicit issuer,
  // split it out
  if (!issuer && label.includes(":")) {
    const colonIndex = label.indexOf(":");
    issuer = label.slice(0, colonIndex);
    label = label.slice(colonIndex + 1);
  }

  // If issuer is provided and label starts with it, strip the duplicate
  if (issuer && label.startsWith(issuer + ":")) {
    label = label.slice(issuer.length + 1);
  }

  // Algorithm (default SHA-1)
  const algorithmRaw = (params.get("algorithm") || "SHA1").toUpperCase();
  let algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  switch (algorithmRaw) {
    case "SHA1":
      algorithm = "SHA-1";
      break;
    case "SHA256":
      algorithm = "SHA-256";
      break;
    case "SHA512":
      algorithm = "SHA-512";
      break;
    default:
      throw new Error(
        `Unsupported TOTP algorithm: "${algorithmRaw}". Supported: SHA1, SHA256, SHA512`,
      );
  }

  // Digits (default 6, allowed 6 or 8)
  const digitsRaw = params.get("digits") || "6";
  const digits = parseInt(digitsRaw, 10);
  if (digits !== 6 && digits !== 8) {
    throw new Error(
      `Invalid TOTP digits: ${digits}. Supported: 6, 8`,
    );
  }

  // Period (default 30)
  const periodRaw = params.get("period") || "30";
  const period = parseInt(periodRaw, 10);
  if (Number.isNaN(period) || period < 1) {
    throw new Error(`Invalid TOTP period: ${periodRaw}`);
  }

  return {
    secret,
    label,
    issuer,
    algorithm,
    digits,
    period,
  };
}

/**
 * Convert a parsed OTP auth URL result into a TOTPConfig suitable
 * for storage in the vault.
 *
 * @param parsed - Result from parseOTPAuthURL()
 * @param originalSecretBase32 - The original base32 secret string (for storage)
 * @returns TOTPConfig
 */
export function toTOTPConfig(
  parsed: ParsedOTPAuthURL,
  originalSecretBase32: string,
): TOTPConfig {
  return {
    secret: originalSecretBase32,
    algorithm: parsed.algorithm,
    digits: parsed.digits,
    period: parsed.period,
    label: parsed.issuer
      ? `${parsed.issuer}: ${parsed.label}`
      : parsed.label,
  };
}
