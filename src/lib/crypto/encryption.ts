// ── Khurklockd Encryption / Decryption ─────────────────────────
// AES-256-GCM encrypt and decrypt with automatic GCM tag handling.
// The Web Crypto API appends the 16-byte authentication tag to
// ciphertext on encrypt, and expects it on decrypt — we never need
// to handle the tag separately.

import { bytesToHex, hexToBytes, generateRandomBytes } from "./utils";

// ── Types ───────────────────────────────────────────────────────

/**
 * An encrypted payload ready for storage.
 * Both fields are hex-encoded.
 */
export interface EncryptedPayload {
  /** AES-256-GCM ciphertext + 16-byte auth tag, hex-encoded. */
  ciphertext: string;
  /** 12-byte initialization vector, hex-encoded. */
  iv: string;
}

// ── Error Classes ───────────────────────────────────────────────

/**
 * Thrown when decryption fails due to a wrong password or corrupted data.
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

/**
 * Thrown when encryption input is invalid.
 */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

// ── Constants ───────────────────────────────────────────────────

/** GCM nonce length in bytes (NIST SP 800-38D recommends 12 bytes). */
const GCM_IV_LENGTH = 12;

/** GCM authentication tag length in bits. */
const GCM_TAG_LENGTH = 128;

// ── Public API ──────────────────────────────────────────────────

/**
 * Encrypt an arbitrary payload using AES-256-GCM.
 *
 * The payload is serialized via JSON.stringify and encrypted with a fresh
 * 12-byte random nonce. The 128-bit GCM authentication tag is automatically
 * appended to the ciphertext by the Web Crypto API.
 *
 * @param payload - Any JSON-serializable value (object, array, string, number, etc.)
 * @param key - A 256-bit AES-GCM CryptoKey (from deriveKey)
 * @returns EncryptedPayload with hex-encoded ciphertext and IV
 * @throws {EncryptionError} If the payload cannot be serialized or encryption fails
 */
export async function encryptVault(
  payload: unknown,
  key: CryptoKey,
): Promise<EncryptedPayload> {
  // Serialize payload to JSON
  let plaintextJson: string;
  try {
    plaintextJson = JSON.stringify(payload);
  } catch (err) {
    throw new EncryptionError(
      `Failed to serialize payload: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Handle empty payload edge case — still encryptable
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(plaintextJson);

  // Generate a fresh 12-byte random nonce
  const iv = generateRandomBytes(GCM_IV_LENGTH);

  try {
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
        tagLength: GCM_TAG_LENGTH,
      },
      key,
      plaintext as BufferSource,
    );

    return {
      ciphertext: bytesToHex(new Uint8Array(ciphertextBuffer)),
      iv: bytesToHex(iv),
    };
  } catch (err) {
    throw new EncryptionError(
      `Encryption failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Decrypt an EncryptedPayload back to the original object using AES-256-GCM.
 *
 * The Web Crypto API validates the 16-byte GCM authentication tag automatically
 * during decryption. If the tag is invalid (wrong password or corrupted data),
 * crypto.subtle.decrypt throws an OperationError.
 *
 * @param encrypted - The encrypted payload (hex-encoded ciphertext + IV)
 * @param key - The same AES-256-GCM CryptoKey used for encryption
 * @returns The original deserialized payload
 * @throws {DecryptionError} If the password is wrong or the data is corrupted
 * @throws {DecryptionError} If the ciphertext or IV hex is invalid
 */
export async function decryptVault(
  encrypted: EncryptedPayload,
  key: CryptoKey,
): Promise<unknown> {
  let ivBytes: Uint8Array;
  let ciphertextBytes: Uint8Array;

  // Decode hex strings — catch encoding errors separately
  try {
    ivBytes = hexToBytes(encrypted.iv);
    ciphertextBytes = hexToBytes(encrypted.ciphertext);
  } catch (err) {
    throw new DecryptionError(
      `Invalid hex encoding: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as BufferSource,
        tagLength: GCM_TAG_LENGTH,
      },
      key,
      ciphertextBytes as BufferSource,
    );

    const decoder = new TextDecoder("utf-8", { fatal: true });
    let plaintextJson: string;
    try {
      plaintextJson = decoder.decode(new Uint8Array(plaintextBuffer));
    } catch {
      throw new DecryptionError(
        "Decrypted data is not valid UTF-8 — the vault file may be corrupted",
      );
    }

    // Parse JSON — if this fails the decryption succeeded but
    // the payload is not valid JSON, which indicates corruption
    try {
      return JSON.parse(plaintextJson);
    } catch {
      throw new DecryptionError(
        "Decrypted data is not valid JSON — the vault file may be corrupted",
      );
    }
  } catch (err) {
    // crypto.subtle.decrypt throws an OperationError when the GCM
    // tag doesn't match — this means wrong password or tampered data
    if (err instanceof DecryptionError) {
      throw err;
    }

    // Web Crypto API errors (OperationError) indicate auth tag mismatch
    throw new DecryptionError(
      "Decryption failed — the master password may be wrong, or the vault file is corrupted",
    );
  }
}
