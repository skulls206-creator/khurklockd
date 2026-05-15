// ── Khurklockd Crypto Module — Barrel Export ───────────────────

// ── Utilities ──────────────────────────────────────────────────
export {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  generateRandomBytes,
  generateUUID,
  constantTimeEqual,
  normalizePassword,
  CryptoEncodingError,
} from "./utils";

// ── Key Derivation ─────────────────────────────────────────────
export { deriveKey, deriveKeyForHmac } from "./argon2";
export type { Argon2Config } from "./argon2";

// ── Encryption ─────────────────────────────────────────────────
export { encryptVault, decryptVault, DecryptionError, EncryptionError } from "./encryption";
export type { EncryptedPayload } from "./encryption";

// ── Integrity ──────────────────────────────────────────────────
export {
  computeHmac,
  verifyHmac,
  computeIntegrityTag,
  verifyIntegrityTag,
  wipeKey,
  IntegrityError,
} from "./integrity";
