// ── Khurklockd Cryptographic Utilities ──────────────────────────
// Low-level encoding helpers and crypto primitives.
// All functions are pure and side-effect-free.

/**
 * Custom error class for cryptographic encoding failures.
 */
export class CryptoEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoEncodingError";
  }
}

/**
 * Convert a hex string to a Uint8Array.
 * Accepts lowercase and uppercase hex, with or without leading "0x".
 *
 * @param hex - Hex-encoded string (e.g., "a1b2c3" or "0xA1B2C3")
 * @returns Byte array of decoded data
 * @throws {CryptoEncodingError} If the string contains non-hex characters or has odd length
 */
export function hexToBytes(hex: string): Uint8Array {
  // Strip optional leading "0x" or "0X" prefix
  let normalized = hex;
  if (normalized.length >= 2 && normalized[0] === "0" && (normalized[1] === "x" || normalized[1] === "X")) {
    normalized = normalized.slice(2);
  }

  // Hex string must have even length
  if (normalized.length % 2 !== 0) {
    throw new CryptoEncodingError(
      `Hex string must have even length, got ${normalized.length} characters`,
    );
  }

  const len = normalized.length / 2;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    const byteHex = normalized.slice(i * 2, i * 2 + 2);
    const byte = parseInt(byteHex, 16);
    if (Number.isNaN(byte)) {
      throw new CryptoEncodingError(
        `Invalid hex character at position ${i * 2}: "${byteHex}"`,
      );
    }
    bytes[i] = byte;
  }

  return bytes;
}

/**
 * Convert a Uint8Array to a lowercase hex string.
 *
 * @param bytes - Byte array to encode
 * @returns Lowercase hex string (no "0x" prefix)
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Decode a base64 string to a Uint8Array.
 * Uses the standard browser base64 alphabet.
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded byte array
 * @throws {CryptoEncodingError} If the string is not valid base64
 */
export function base64ToBytes(base64: string): Uint8Array {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new CryptoEncodingError("Invalid base64 string");
  }
}

/**
 * Encode a Uint8Array to a base64 string.
 * Uses the standard browser base64 alphabet.
 *
 * @param bytes - Byte array to encode
 * @returns Base64-encoded string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  // Build a binary string from the byte array
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generate cryptographically secure random bytes.
 * Uses crypto.getRandomValues() under the hood.
 *
 * @param length - Number of random bytes to generate
 * @returns Uint8Array filled with random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a UUID v4 string.
 * Delegates to the browser's crypto.randomUUID(). Only available in secure contexts (HTTPS / localhost).
 *
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Constant-time comparison of two Uint8Arrays.
 * Resistant to timing side-channel attacks: the comparison always
 * iterates over the full length of both arrays regardless of where
 * the first difference occurs.
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns True if both arrays contain identical bytes
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // If lengths differ, we still do a constant-time comparison
  // by comparing against dummy zero bytes. This prevents leaking
  // the length difference through timing.
  const maxLen = Math.max(a.length, b.length);
  let result = 0;

  for (let i = 0; i < maxLen; i++) {
    const byteA = i < a.length ? a[i] : 0;
    const byteB = i < b.length ? b[i] : 0;
    result |= byteA ^ byteB;
  }

  // Also compare lengths (OR'd into result so it doesn't short-circuit)
  result |= (a.length ^ b.length);

  return result === 0;
}

/**
 * Normalize a password string using Unicode NFC normalization.
 * Ensures that visually identical characters with different Unicode
 * representations produce the same key material.
 *
 * @param password - Raw password string
 * @returns NFC-normalized password
 */
export function normalizePassword(password: string): string {
  return password.normalize("NFC");
}
