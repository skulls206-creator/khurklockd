// ── Khurklockd Key Derivation ──────────────────────────────────
//
// TODO: Replace PBKDF2 with Argon2id via hash-wasm for production.
// See docs/ARCHITECTURE.md Section 2.1.
//
// The current implementation uses PBKDF2-SHA256 as a browser-native
// key derivation function. While PBKDF2 is not memory-hard (unlike
// Argon2id), it provides adequate protection when combined with a
// strong master password and a high iteration count.
//
// When hash-wasm becomes available:
//   npm add hash-wasm
//   Replace deriveKey() with Argon2id:
//     import { argon2id } from "hash-wasm";
//     const hash = await argon2id({
//       password,
//       salt,
//       parallelism: config.parallelism,
//       iterations: config.iterations,
//       memorySize: config.memory,
//       hashLength: 32,
//       outputType: "binary",
//     });
//     return crypto.subtle.importKey("raw", hash, ...);
//
// The PBKDF2 iteration count is intentionally much higher than Argon2
// would use, because PBKDF2 is trivially parallelizable and lacks
// memory hardness.

/**
 * Configuration for the key derivation function.
 * The `memory` and `parallelism` fields are accepted for forward
 * compatibility with Argon2id, but PBKDF2 ignores them.
 */
export interface Argon2Config {
  /** Number of iterations (PBKDF2 uses 600_000; Argon2id would use 3). */
  iterations: number;
  /** Memory cost in KiB (ignored by PBKDF2, used by Argon2id). */
  memory: number;
  /** Parallelism factor (ignored by PBKDF2, used by Argon2id). */
  parallelism: number;
}

/** Default PBKDF2 configuration. */
const DEFAULT_CONFIG: Readonly<Argon2Config> = {
  iterations: 600_000,
  memory: 65536,
  parallelism: 4,
};

/**
 * Derive a 256-bit AES-GCM key from a password and salt using PBKDF2-SHA256.
 *
 * The resulting key is marked non-extractable so it cannot be exported from
 * the browser's crypto subsystem.
 *
 * @param password - The master password (will be NFC-normalized internally)
 * @param salt - 32-byte random salt
 * @param config - Optional override for iterations/memory/parallelism (partial)
 * @returns A non-extractable CryptoKey suitable for AES-256-GCM operations
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  config?: Partial<Argon2Config>,
): Promise<CryptoKey> {
  const cfg: Argon2Config = { ...DEFAULT_CONFIG, ...config };

  // Encode the password as UTF-8 bytes
  // Normalization (NFC) is handled by the caller — we receive raw bytes
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password.normalize("NFC"));

  // Derive key material using PBKDF2
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // Derive a 256-bit AES-GCM key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: cfg.iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable
    ["encrypt", "decrypt"],
  );

  return derivedKey;
}

/**
 * Derive a 256-bit HMAC key from a password and salt using PBKDF2-SHA256.
 *
 * The resulting key is marked non-extractable. This is used for vault
 * integrity verification separate from the encryption key.
 *
 * @param password - The master password (will be NFC-normalized internally)
 * @param salt - 32-byte random salt (should differ from the encryption salt)
 * @param config - Optional override for iterations/memory/parallelism (partial)
 * @returns A non-extractable CryptoKey suitable for HMAC-SHA256 operations
 */
export async function deriveKeyForHmac(
  password: string,
  salt: Uint8Array,
  config?: Partial<Argon2Config>,
): Promise<CryptoKey> {
  const cfg: Argon2Config = { ...DEFAULT_CONFIG, ...config };

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password.normalize("NFC"));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: cfg.iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 256,
    },
    false, // non-extractable
    ["sign", "verify"],
  );

  return derivedKey;
}
