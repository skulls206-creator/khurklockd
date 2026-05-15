// ── Khurklockd Integrity Verification ──────────────────────────
// HMAC-SHA256 computation and verification for vault integrity.
// Every vault write computes a fresh integrity tag; every vault read
// verifies it before decrypting so we can detect corruption early.

import { bytesToHex, hexToBytes, constantTimeEqual } from "./utils";

/**
 * Custom error class for integrity verification failures.
 */
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrityError";
  }
}

/**
 * Derive a raw HMAC key from a CryptoKey for use with the HMAC algorithm.
 *
 * This is an internal helper. Since the CryptoKey from deriveKeyForHmac is
 * already an HMAC-capable key, we use it directly. But when working with
 * keys that might be derived differently, this provides a consistent import
 * path.
 *
 * @param keyMaterial - Raw key bytes
 * @returns An HMAC-SHA256 CryptoKey (extractable=false)
 */
/**
 * Compute an HMAC-SHA256 tag over arbitrary data.
 *
 * Uses a pre-derived HMAC CryptoKey for signing. The tag is returned
 * as a lowercase hex string.
 *
 * @param data - The data to authenticate (any string)
 * @param key - An HMAC-capable CryptoKey (from deriveKeyForHmac or importHmacKey)
 * @returns Hex-encoded HMAC-SHA256 tag (64 hex characters)
 */
export async function computeHmac(
  data: string,
  key: CryptoKey,
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  const signature = await crypto.subtle.sign("HMAC", key, dataBytes as BufferSource);
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Verify an HMAC-SHA256 tag against data using a constant-time comparison.
 *
 * @param data - The original data string
 * @param expectedTag - Hex-encoded HMAC tag to verify against
 * @param key - The same HMAC CryptoKey used to compute the tag
 * @returns True if the tag matches; false otherwise
 */
export async function verifyHmac(
  data: string,
  expectedTag: string,
  key: CryptoKey,
): Promise<boolean> {
  let expectedBytes: Uint8Array;
  try {
    expectedBytes = hexToBytes(expectedTag);
  } catch {
    return false;
  }

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  try {
    const actualSignature = await crypto.subtle.sign("HMAC", key, dataBytes as BufferSource);
    const actualBytes = new Uint8Array(actualSignature);
    return constantTimeEqual(actualBytes, expectedBytes);
  } catch {
    return false;
  }
}

/**
 * Compute an integrity tag for an encrypted vault payload.
 *
 * This is a convenience wrapper around computeHmac. The payload should be
 * the JSON-stringified encrypted vault blob. We compute the HMAC over the
 * exact ciphertext string (including IV metadata) so any tampering is detected.
 *
 * @param encryptedPayload - The encrypted payload string to protect
 * @param key - HMAC CryptoKey
 * @returns Hex-encoded HMAC-SHA256 integrity tag
 */
export async function computeIntegrityTag(
  encryptedPayload: string,
  key: CryptoKey,
): Promise<string> {
  return computeHmac(encryptedPayload, key);
}

/**
 * Verify an integrity tag for an encrypted vault payload.
 *
 * Convenience wrapper around verifyHmac. Compares the stored tag against
 * a freshly computed one using constant-time comparison.
 *
 * @param encryptedPayload - The encrypted payload string to verify
 * @param expectedTag - Hex-encoded integrity tag from the vault file
 * @param key - HMAC CryptoKey
 * @returns True if the tag is valid; false if tampered or corrupted
 */
export async function verifyIntegrityTag(
  encryptedPayload: string,
  expectedTag: string,
  key: CryptoKey,
): Promise<boolean> {
  return verifyHmac(encryptedPayload, expectedTag, key);
}

/**
 * Securely wipe a CryptoKey from memory by allowing it to be garbage collected.
 *
 * This sets the variable to null. Since CryptoKeys are non-extractable,
 * this is the best we can do in the browser environment.
 *
 * @param key - The CryptoKey to nullify (pass by reference via mutable container)
 */
export function wipeKey(key: { current: CryptoKey | null }): void {
  key.current = null;
}
