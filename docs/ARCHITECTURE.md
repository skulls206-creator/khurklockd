# Khurklockd — Technical Architecture Document

**Version:** 1.0.0
**Last Updated:** 2026-05-12
**Author:** Khurk Services / Nebula Engineering
**Repository:** [github.com/skulls206-creator/khurklockd](https://github.com/skulls206-creator/khurklockd)

> A local-first, zero-knowledge password manager with optional Lighthouse.Storage (IPFS) encrypted backup. All cryptography happens client-side in the browser. No plaintext ever leaves the user's machine.

---

## Table of Contents

1. [Vault File Format](#1-vault-file-format)
2. [Cryptography Specification](#2-cryptography-specification)
3. [Threat Model](#3-threat-model)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Component Architecture](#5-component-architecture)
6. [Technology Stack](#6-technology-stack)
7. [Competitor Feature Comparison Matrix](#7-competitor-feature-comparison-matrix)
8. [Development Roadmap](#8-development-roadmap)
9. [Monetization Strategy](#9-monetization-strategy)
10. [Regulatory Compliance](#10-regulatory-compliance)

---

## 1. Vault File Format

### 1.1 File Extension

All vault files use the `.khurklockd` extension (e.g., `my-vault.khurklockd`, `work-passwords.khurklockd`). The extension is registered as a custom MIME type `application/x-khurklockd-vault` for file-picker filtering. The file is a single-line, minified JSON document with no trailing whitespace.

### 1.2 Top-Level Vault Structure

```json
{
  "version": "1.0.0",
  "createdAt": "2026-05-12T23:00:00.000Z",
  "updatedAt": "2026-05-12T23:30:00.000Z",
  "keySalt": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2",
  "encryptedPayload": "dGhpcyBpcyBhIGJhc2U2NCBlbmNvZGVkIEF...",
  "iv": "a1b2c3d4e5f6a7b8c9d0",
  "integrityTag": "f7e8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}
```

#### Field Definitions

| Field | Type | Size | Description |
|-------|------|------|-------------|
| `version` | `string` | Variable (semver) | Vault format version. Used to detect format migrations. |
| `createdAt` | `string` | 24 chars (ISO 8601) | UTC timestamp of vault creation. ISO 8601 with milliseconds and `Z` suffix. |
| `updatedAt` | `string` | 24 chars (ISO 8601) | UTC timestamp of last save. Updated on every write. |
| `keySalt` | `string` | 64 hex chars (32 bytes) | Random salt used for Argon2id key derivation. Generated once at vault creation, never changes. |
| `encryptedPayload` | `string` | Base64, variable | AES-256-GCM ciphertext of the serialized `VaultPayload` JSON. Includes GCM authentication tag appended by Web Crypto API. |
| `iv` | `string` | 24 hex chars (12 bytes) | Initialization vector (nonce) for AES-256-GCM. Generated fresh for every encryption operation. |
| `integrityTag` | `string` | 64 hex chars (32 bytes) | HMAC-SHA256 over `encryptedPayload` (before base64 encoding). Used for integrity verification prior to decryption. |

### 1.3 VaultPayload (Decrypted Inner Structure)

After successful decryption, the `encryptedPayload` decodes to this JSON structure:

```json
{
  "items": [],
  "settings": {}
}
```

#### 1.3.1 VaultSettings

```typescript
interface VaultSettings {
  /** User-assigned display name for this vault */
  vaultName: string;
  /** Argon2id iteration count (default: 3) */
  argon2Iterations: number;
  /** Argon2id memory in KiB (default: 65536 = 64 MiB) */
  argon2Memory: number;
  /** Argon2id parallelism threads (default: 4) */
  argon2Parallelism: number;
  /** Auto-lock timeout in minutes (default: 5, 0 = never) */
  lockTimeout: number;
  /** Clipboard auto-clear delay in seconds (default: 30) */
  clipboardClearDelay: number;
  /** Whether to show password strength indicators */
  showStrengthIndicators: boolean;
  /** Default password generation config */
  defaultGeneratorConfig: GeneratorConfig;
  /** Lighthouse backup CIDs with timestamps */
  backupCIDs: BackupRecord[];
  /** Theme preference */
  theme: "system" | "dark" | "light";
  /** Language locale for i18n */
  locale: string;
}

interface BackupRecord {
  cid: string;
  timestamp: string; // ISO 8601
  sizeBytes: number;
}
```

#### 1.3.2 VaultItem Discriminated Union

All items share a common base and are discriminated by their `type` field.

```typescript
interface VaultItemBase {
  /** Unique ID generated via crypto.randomUUID() */
  id: string;
  /** Discriminator */
  type: "login" | "note" | "card" | "identity";
  /** User-assigned display name */
  name: string;
  /** Whether this item is starred/favorited */
  favorite: boolean;
  /** Categories or folders (user-defined tags) */
  tags: string[];
  /** Custom icon name from the icon set */
  icon: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-modified timestamp */
  updatedAt: string;
  /** ISO 8601 for soft-deleted items (null = active) */
  deletedAt: string | null;
}
```

##### LoginItem (`type: "login"`)

```typescript
interface LoginItem extends VaultItemBase {
  type: "login";
  /** Website or app URL */
  urls: string[];
  /** Username or email */
  username: string;
  /** Encrypted password (in-memory only, stored encrypted) */
  password: string;
  /** TOTP secret key (null if not configured) */
  totpSecret: string | null;
  /** Free-text notes attached to this login */
  notes: string;
  /** Custom fields (key-value pairs) */
  customFields: Array<{ name: string; value: string; type: "text" | "hidden" }>;
}
```

##### NoteItem (`type: "note"`)

```typescript
interface NoteItem extends VaultItemBase {
  type: "note";
  /** The note body (markdown-capable, plain text stored) */
  content: string;
  /** Subject line or title override */
  subject: string;
}
```

##### CardItem (`type: "card"`)

```typescript
interface CardItem extends VaultItemBase {
  type: "card";
  /** Cardholder name as it appears on the card */
  cardholderName: string;
  /** Card number (last 4 digits stored, full number in encrypted vault) */
  number: string;
  /** Brand: visa, mastercard, amex, discover, other */
  brand: "visa" | "mastercard" | "amex" | "discover" | "other";
  /** Expiration month (1-12) */
  expMonth: number;
  /** Expiration year (4-digit) */
  expYear: number;
  /** CVV/CVC security code */
  cvv: string;
  /** Billing address */
  billingAddress: string;
  /** Bank name or issuing institution */
  bankName: string;
  /** Card PIN (for debit cards) */
  pin: string;
}
```

##### IdentityItem (`type: "identity"`)

```typescript
interface IdentityItem extends VaultItemBase {
  type: "identity";
  /** Title (Mr, Mrs, Ms, Dr, etc.) */
  title: string;
  /** First name */
  firstName: string;
  /** Middle name */
  middleName: string;
  /** Last name */
  lastName: string;
  /** Email address */
  email: string;
  /** Phone number */
  phone: string;
  /** Physical address */
  address: string;
  /** City */
  city: string;
  /** State or province */
  state: string;
  /** Postal / ZIP code */
  postalCode: string;
  /** Country (ISO 3166-1 alpha-2) */
  country: string;
  /** Date of birth (YYYY-MM-DD) */
  dateOfBirth: string;
  /** National ID / SSN / passport number */
  nationalId: string;
  /** Additional custom fields */
  customFields: Array<{ name: string; value: string; type: "text" | "hidden" }>;
}
```

### 1.4 Versioning Strategy

- The `version` field follows **semantic versioning** (`MAJOR.MINOR.PATCH`).
- **PATCH** bump: backward-compatible fixes (e.g., adding optional fields with defaults).
- **MINOR** bump: new item types or settings added; older versions can still open with ignored unknown fields.
- **MAJOR** bump: breaking changes to encryption scheme, key derivation, or structural renames that require explicit migration.
- On vault load, the app compares the loaded `version` against its supported range (`>= 1.0.0` and `< 2.0.0` for v1.x). If the version is unsupported, the user is shown a migration wizard: "This vault was created with a newer version of Khurklockd. Would you like to migrate?"
- Forward compatibility: if the loaded version is higher than the app supports, the user is prompted to update the app first.
- Migration tools are built into the vault layer so a future `migrateVault(vault: Vault): Vault` function can transform between major versions.

### 1.5 Vault Size Constraints

- **Maximum encrypted vault size:** 100 MB (to respect the Lighthouse.Storage 100 MB free-tier cap).
- **Soft warning threshold:** 80 MB — the app shows a non-blocking banner: "Your vault is approaching the 100 MB Lighthouse backup limit. Consider removing unused items or attachments."
- **Hard limit:** 100 MB — backup uploads are rejected. Local saves still work. The user is directed to upgrade to Pro for a higher cap (future).
- Size is measured as `new Blob([JSON.stringify(vault)]).size` in bytes.
- Typical vault sizes: 1,000 login items with notes and TOTP secrets ~ 500 KB. 100 MB accommodates ~200,000 items or vaults with large embedded attachments (future feature).

---

## 2. Cryptography Specification

### 2.1 Key Derivation — Argon2id

#### 2.1.1 Algorithm Selection

Argon2id is chosen as the Password-Based Key Derivation Function (PBKDF) for its resistance to both side-channel (Argon2i) and GPU (Argon2d) attacks. Argon2id is the hybrid variant recommended by the Password Hashing Competition and OWASP.

#### 2.1.2 Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Salt | 32 random bytes | Fixed 32 bytes | Generated via `crypto.getRandomValues()`. Stored as hex in `keySalt`. Regenerated never — one salt per vault. |
| Iterations (`t`) | 3 | 1–10 | Time cost. Each iteration doubles the time cost. |
| Memory (`m`) | 65,536 KiB (64 MiB) | 8,192–262,144 KiB | Memory cost. Higher values increase GPU resistance. |
| Parallelism (`p`) | 4 | 1–8 | Degree of parallelism. Should match available CPU threads. |
| Output length | 32 bytes (256 bits) | Fixed 32 bytes | Derived key length for AES-256. |
| Hash type | Argon2id | Fixed | Never changes — this is the defining property of the scheme. |

#### 2.1.3 Derivation Process

```
primaryKey = Argon2id(
  password: UTF-8 encoded master password,
  salt: hex-decoded keySalt (32 bytes),
  t: iterations,
  m: memory,
  p: parallelism,
  hashLen: 32,
  type: Argon2id
)
```

- The master password is normalized via Unicode NFC before encoding to UTF-8 bytes.
- The derived 256-bit key is never serialized, logged, or persisted. It exists only as a `CryptoKey` object in the Web Crypto API key store for the duration of the unlocked session.
- On lock, the `CryptoKey` is explicitly revoked via `SubtleCrypto` if the implementation supports it, and the JavaScript reference is nullified.

#### 2.1.4 Configurable Parameters

Users may adjust Argon2id parameters in VaultSettings. Higher values increase unlock time but improve brute-force resistance. The app includes a "benchmark" utility on the Settings page that runs the derivation with current parameters and reports elapsed time, with guidance:

- < 500 ms: "Strong protection (recommended)"
- 500–1000 ms: "Very strong protection"
- 1000–2000 ms: "Maximum protection (slower unlock)"
- \> 2000 ms: "May feel sluggish on this device"

Changing parameters requires re-encrypting the vault with a newly derived key. The salt does not change.

### 2.2 Encryption — AES-256-GCM

#### 2.2.1 Algorithm Selection

AES-256-GCM (Galois/Counter Mode) provides both confidentiality and authenticity in a single operation. The Web Crypto API's `SubtleCrypto.encrypt()` and `SubtleCrypto.decrypt()` implement this natively with hardware acceleration on most modern browsers.

#### 2.2.2 Encryption Operation

```
Input:  VaultPayload (serialized JSON string)
        primaryKey (CryptoKey, 256-bit AES-GCM)
        nonce (12 random bytes)

1. Encode VaultPayload as UTF-8 bytes via TextEncoder
2. Call crypto.subtle.encrypt(
     { name: "AES-GCM", iv: nonce, tagLength: 128 },
     primaryKey,
     plaintextBytes
   )
3. Result is ciphertext + 16-byte authentication tag (appended by GCM)
4. Base64-encode the combined result → encryptedPayload
5. Store nonce as hex string → iv
```

#### 2.2.3 Nonce (IV) Management

- Nonce is **12 bytes** (96 bits), the recommended size for AES-GCM.
- Generated via `crypto.getRandomValues(new Uint8Array(12))`.
- A **new nonce is generated for every encryption operation** — write, backup, re-encrypt. Never reuse a nonce with the same key.
- Nonce reuse with AES-GCM catastrophically breaks both confidentiality and authentication. The architecture prevents this by always generating fresh random nonces per operation.
- Nonce is stored in the vault file as a hex string (`iv` field) alongside the ciphertext.

#### 2.2.4 Decryption Operation

```
Input:  encryptedPayload (Base64 string)
        primaryKey (CryptoKey)
        iv (hex string → 12-byte Uint8Array)

1. Base64-decode encryptedPayload → ciphertext byte array
2. Call crypto.subtle.decrypt(
     { name: "AES-GCM", iv: nonceBytes, tagLength: 128 },
     primaryKey,
     ciphertextBytes
   )
3. If decryption fails with OperationError → wrong password or corrupted data
4. Decode resulting bytes via TextDecoder → VaultPayload JSON string
5. Parse JSON → VaultPayload object
```

### 2.3 Integrity Verification — HMAC-SHA256

#### 2.3.1 Purpose

AES-GCM provides authenticated encryption, meaning tampering with the ciphertext causes decryption to fail. However, to **fail fast** and to detect corruption before attempting expensive Argon2id key derivation, an additional HMAC-SHA256 integrity tag is computed over the `encryptedPayload` (the Base64 string).

#### 2.3.2 HMAC Computation (at write time)

```
Input:  encryptedPayload (Base64 string)
        primaryKey (CryptoKey, 256-bit)

1. Export raw key bytes from primaryKey (one-time for HMAC use)
2. Import as HMAC key:
   crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
3. Compute HMAC:
   crypto.subtle.sign("HMAC", hmacKey, TextEncoder.encode(encryptedPayload))
4. Convert resulting 32 bytes to hex string → integrityTag
```

#### 2.3.3 HMAC Verification (at read time)

```
1. Import HMAC key from derived primaryKey (same as above)
2. Compute HMAC over loaded encryptedPayload
3. Compare (constant-time) against stored integrityTag
4. If mismatch → vault file has been tampered with — ABORT
5. If match → proceed to decryption
```

- HMAC comparison uses `crypto.subtle.timingSafeEqual` where available, falling back to a byte-by-byte comparison that avoids early exit.
- A failed HMAC check is reported to the user as: "This vault file appears to be corrupted or has been tampered with. Do not trust its contents."

### 2.4 Memory Security

#### 2.4.1 Plaintext Lifecycle

1. **Vault Unlock:** VaultPayload is deserialized into JavaScript heap memory. It is held in a single module-scoped variable (`activeVault`) in `vault-manager.ts`.
2. **Edits:** Mutations to individual items are performed on the in-memory VaultPayload. The entire payload is re-encrypted on save — no incremental/delta encryption.
3. **Lock:** The `lockVault()` function performs these steps in order:
   - Assigns `null` to every property of the VaultPayload object.
   - Assigns `null` to every item in the `items` array (deep nullification).
   - Sets `activeVault = null`.
   - Nullifies any intermediate copies or cached values.
   - Garbage collection cannot be forced programmatically, but the app calls `URL.revokeObjectURL()` on any blob URLs and clears all closures referencing vault data.
4. **Clipboard:** Copied passwords are cleared after `clipboardClearDelay` seconds (default 30) by overwriting the clipboard with an empty string via `navigator.clipboard.writeText("")`.

#### 2.4.2 What NEVER Happens

- Plaintext is **never** written to `localStorage` or `sessionStorage`.
- Plaintext is **never** written to IndexedDB (only encrypted blobs go there for Lighthouse cache).
- The master password is **never** stored anywhere — not hashed, not cached. It is held only for the duration of the Argon2id call, then the string is zeroed.
- Derived keys are **never** sent over the network. The `primaryKey` CryptoKey object is `extractable: false` so raw bytes cannot be exported.
- The `encryptedPayload` is **never** sent to any server except during Lighthouse upload, and even then it is the already-encrypted ciphertext.
- Console.log of vault data is stripped by an ESLint rule (`no-restricted-syntax`) and a build-time check.

#### 2.4.3 Lock Timer

- A global `setTimeout` / `requestAnimationFrame` listener tracks user interaction.
- Any of the following resets the lock timer: `mousedown`, `keydown`, `touchstart`, `scroll`, `focus`.
- When the timer fires (after `lockTimeout` minutes of inactivity), `lockVault()` is called.
- During TOTP code display, the lock timer is set to a minimum of `lockTimeout` minutes even if user interaction occurs, to prevent lock during code viewing (configurable).
- If the browser tab loses focus (`visibilitychange` event) for more than 30 seconds, the timer is advanced by 50% (i.e., lock happens sooner).

---

## 3. Threat Model

### 3.1 Assets

| Asset | Sensitivity | Storage Location |
|-------|-------------|-----------------|
| Vault file (`.khurklockd`) | High — contains all secrets, encrypted | User's local filesystem |
| Master password | Critical — unlocks all secrets | User's memory only |
| Derived key | Critical — decrypts vault | Browser memory, non-extractable |
| Decrypted VaultPayload | Critical — plaintext secrets | Browser memory, auto-locked |
| Lighthouse API key | Medium — allows backup upload/download | VaultSettings (encrypted inside vault) |
| Backup CIDs | Low — public on IPFS, identifies encrypted blobs | VaultSettings + Lighthouse index |

### 3.2 Adversaries

| Adversary | Capability | Mitigation |
|-----------|-----------|------------|
| **Attacker with vault file** | Has stolen the `.khurklockd` file. May attempt offline brute-force. | Argon2id (64 MiB memory-hard) makes GPU brute-force impractical. AES-256-GCM prevents decryption without key. |
| **Malicious browser extension** | Can read DOM, access JS heap, intercept events. | Auto-lock minimizes plaintext window. No plaintext in DOM except actively displayed fields — which are cleared on blur. Passwords rendered in `type="password"` inputs by default. |
| **Network MITM** | Intercepts Lighthouse upload traffic. | All data encrypted client-side before upload. MITM sees only AES-256-GCM ciphertext. No key material in transit. |
| **Compromised Lighthouse/IPFS node** | Controls a storage node hosting backup blobs. | Zero-knowledge — node sees only encrypted blobs and public CIDs. Cannot decrypt without master password. |
| **Physical access to unlocked device** | User walks away from unlocked computer. | Lock timer (default 5 min). Manual lock via system tray or keyboard shortcut. |
| **Cloud storage provider** | User syncs `.khurklockd` file via Dropbox/Google Drive/iCloud. | File is always encrypted. Provider sees only ciphertext. |
| **Malware on user's machine** | Keylogger, screen capture, clipboard scraper. | OUT OF SCOPE — no software defense against OS-level compromise. User is advised to maintain endpoint security. |

### 3.3 In-Scope Threats (Mitigated)

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|--------------|------------|---------------|
| **Brute-force on vault file** | Attacker runs dictionary/brute-force against stolen `.khurklockd`. | Argon2id with 64 MiB memory and 3 iterations makes each guess expensive (~200ms on modern hardware). AES-256 key space is 2^256. | Weak master passwords remain vulnerable despite KDF. App enforces minimum 8 characters with strength meter. |
| **Memory scraping** | Malicious extension reads decrypted vault from JS heap. | Auto-lock clears plaintext. No global variables hold decrypted data after lock. Items are loaded on demand, not all at once. | While unlocked, extension could access currently displayed data. Mitigated by CSP and extension permission model. |
| **File tampering** | Attacker modifies `.khurklockd` to inject malicious payloads or corrupt data. | HMAC-SHA256 integrity check catches any modification. Decryption is aborted before any plaintext is processed. | None — tampering is reliably detected. |
| **MITM during backup/restore** | Attacker intercepts HTTPS traffic to Lighthouse API. | All data is encrypted client-side. HTTPS provides transport security. MITM sees only encrypted blobs + public CIDs. | TLS compromise could reveal CIDs (but not contents). |
| **Compromised Lighthouse node** | IPFS node operator inspects stored data. | Zero-knowledge: vault is encrypted before upload. Node cannot derive key without master password. | Node could refuse to serve data (availability attack). Multiple IPFS replicas mitigate this. |
| **Nonce reuse** | Bug reuses AES-GCM nonce across encryptions. | Code review: nonce generated fresh via `crypto.getRandomValues()` on every `encryptVault()` call. Unit tests assert uniqueness. | PRNG failure (extremely unlikely with CSPRNG). |

### 3.4 Out-of-Scope Threats (Acknowledged, Not Mitigated)

| Threat | Why Out of Scope |
|--------|-----------------|
| **Keyloggers** | OS-level compromise; no JavaScript API can detect or prevent hardware/software keyloggers. |
| **Screen capture malware** | Cannot prevent OS from capturing framebuffer. User-level mitigation: enable auto-lock, use privacy screen. |
| **Physical access to unlocked device** | If the device is unlocked and Khurklockd is open, an attacker with physical access can view secrets. Mitigation: lock timer, but this is ultimately a physical security issue. |
| **Side-channel attacks** | Timing, power analysis, and electromagnetic side channels are not practical to defend against in a browser-based web app. |
| **Supply chain attacks on npm dependencies** | Malicious package in the dependency tree could exfiltrate data at build time or runtime. Mitigated by: lockfile (`package-lock.json`), npm audit, SBOM generation. Not fully preventable. |
| **Browser zero-day** | If the browser itself is compromised, all web apps are vulnerable. No application-level defense. |
| **Rubber-hose cryptanalysis** | Khurklockd cannot protect against coercion. Future: duress password feature (decoy vault). |

### 3.5 Security Assumptions

1. The user's browser is not compromised by malware.
2. The `crypto.getRandomValues()` CSPRNG is not backdoored.
3. The Web Crypto API implementation is correct (browser vendor's responsibility).
4. The user chooses a strong master password (>= 12 characters, not in breach databases).
5. The user keeps their operating system and browser updated.
6. The `@lighthouse-web3/sdk` package is not malicious (pinned to a specific version and hash-verified).

---

## 4. Data Flow Diagrams

### Flow 1: Vault Creation

```
┌─────────────────────────────────────────────────────────────────┐
│                      VAULT CREATION FLOW                         │
└─────────────────────────────────────────────────────────────────┘

User                        App                         Browser APIs
 │                           │                              │
 │  Enter master password    │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  crypto.getRandomValues(32)  │
 │                           ├─────────────────────────────►│
 │                           │  ◄── salt (32 random bytes)  │
 │                           │                              │
 │                           │  crypto.getRandomValues(12)  │
 │                           ├─────────────────────────────►│
 │                           │  ◄── nonce (12 random bytes) │
 │                           │                              │
 │                           │  Argon2id(password, salt)     │
 │                           │  (hash-wasm WASM)             │
 │                           ├──┐                           │
 │                           │  │ 64 MiB memory             │
 │                           │  │ 3 iterations              │
 │                           │  │ 4 parallelism             │
 │                           │◄─┘                           │
 │                           │  ◄── primaryKey (256-bit)     │
 │                           │                              │
 │                           │  Create empty VaultPayload:   │
 │                           │  { items: [],                  │
 │                           │    settings: defaults }        │
 │                           │                              │
 │                           │  JSON.stringify(VaultPayload) │
 │                           │  TextEncoder.encode(json)     │
 │                           │                              │
 │                           │  crypto.subtle.encrypt(       │
 │                           │    AES-GCM,                    │
 │                           │    primaryKey,                 │
 │                           │    nonce,                      │
 │                           │    plaintext                    │
 │                           │  )                             │
 │                           ├─────────────────────────────►│
 │                           │  ◄── ciphertext + auth tag   │
 │                           │                              │
 │                           │  Base64(ciphertext)           │
 │                           │  = encryptedPayload            │
 │                           │                              │
 │                           │  HMAC-SHA256(                 │
 │                           │    primaryKey,                 │
 │                           │    encryptedPayload            │
 │                           │  )                             │
 │                           │  = integrityTag (hex)          │
 │                           │                              │
 │                           │  Construct Vault object:       │
 │                           │  { version: "1.0.0",           │
 │                           │    createdAt, updatedAt,       │
 │                           │    keySalt, encryptedPayload,  │
 │                           │    iv, integrityTag }          │
 │                           │                              │
 │                           │  JSON.stringify(Vault)         │
 │                           │                              │
 │                           │  File System Access API:       │
 │                           │  showSaveFilePicker(           │
 │                           │    .khurklockd                 │
 │                           │  )                             │
 │                           ├─────────────────────────────►│
 │                           │                              │
 │  ┌─────────┐              │                              │
 │  │ Save As │◄─────────────┤                              │
 │  │ Dialog  │              │                              │
 │  └────┬────┘              │                              │
 │       │ Choose location   │                              │
 │       │ & filename        │                              │
 │       ├─────────────────►│                              │
 │       │                   │                              │
 │       │                   │  writableStream.write(vault) │
 │       │                   ├─────────────────────────────►│
 │       │                   │                              │
 │       │  "Vault created   │                              │
 │       │   successfully!"  │                              │
 │       │◄──────────────────┤                              │
 │       │                   │                              │
 │       │                   │  Hold VaultPayload in memory  │
 │       │                   │  Navigate to Dashboard        │
```

### Flow 2: Vault Unlock

```
┌─────────────────────────────────────────────────────────────────┐
│                      VAULT UNLOCK FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User                        App                         Browser APIs
 │                           │                              │
 │  Click "Open Vault"       │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  File System Access API:      │
 │                           │  showOpenFilePicker(          │
 │                           │    .khurklockd                │
 │                           │  )                             │
 │                           ├─────────────────────────────►│
 │  ┌─────────┐              │                              │
 │  │ Open    │◄─────────────┤                              │
 │  │ Dialog  │              │                              │
 │  └────┬────┘              │                              │
 │       │ Select file       │                              │
 │       ├─────────────────►│                              │
 │       │                   │                              │
 │       │                   │  fileHandle.getFile()          │
 │       │                   ├─────────────────────────────►│
 │       │                   │  ◄── File object              │
 │       │                   │                              │
 │       │                   │  JSON.parse(await file.text())│
 │       │                   │  = Vault object                │
 │       │                   │                              │
 │       │                   │  Validate version             │
 │       │                   │  Extract: salt, encrypted-    │
 │       │                   │  Payload, iv, integrityTag    │
 │       │                   │                              │
 │  Enter master password    │                              │
 │◄──────────────────────────┤                              │
 │                           │                              │
 │  (password typed)         │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  Argon2id(password, salt)     │
 │                           ├──┐                           │
 │                           │  │ (same params as creation) │
 │                           │◄─┘                           │
 │                           │  ◄── candidateKey            │
 │                           │                              │
 │                           │  HMAC-SHA256(                │
 │                           │    candidateKey,              │
 │                           │    encryptedPayload           │
 │                           │  )                             │
 │                           │                              │
 │                           │  COMPARE with integrityTag    │
 │                           │  ┌─MISMATCH──► "File is      │
 │                           │  │             corrupted"     │
 │                           │  └─MATCH─────► Continue       │
 │                           │                              │
 │                           │  Base64-decode encrypted-     │
 │                           │  Payload → ciphertext         │
 │                           │                              │
 │                           │  crypto.subtle.decrypt(       │
 │                           │    AES-GCM,                    │
 │                           │    candidateKey,               │
 │                           │    nonce (from iv),            │
 │                           │    ciphertext                   │
 │                           │  )                             │
 │                           ├─────────────────────────────►│
 │                           │  ◄── plaintext bytes          │
 │                           │                              │
 │                           │  ┌─FAILS────► "Wrong          │
 │                           │  │            password"       │
 │                           │  └─SUCCEEDS─► Continue        │
 │                           │                              │
 │                           │  TextDecoder.decode(bytes)   │
 │                           │  JSON.parse → VaultPayload    │
 │                           │                              │
 │                           │  Store in activeVault (mem)   │
 │                           │  Start lock timer              │
 │                           │  Navigate to Dashboard         │
 │       │                   │                              │
 │       │  Dashboard shown  │                              │
 │       │◄──────────────────┤                              │
```

### Flow 3: Save Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAVE CHANGES FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User                        App                         Browser APIs
 │                           │                              │
 │  Edit item (e.g., add     │                              │
 │  a new login)             │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  Update VaultPayload.items    │
 │                           │  in memory                    │
 │                           │  (no disk write yet)           │
 │                           │                              │
 │  Click "Save" or          │                              │
 │  auto-save triggers       │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  crypto.getRandomValues(12)  │
 │                           ├─────────────────────────────►│
 │                           │  ◄── new nonce               │
 │                           │                              │
 │                           │  JSON.stringify(VaultPayload)│
 │                           │  TextEncoder.encode(json)     │
 │                           │                              │
 │                           │  crypto.subtle.encrypt(       │
 │                           │    AES-GCM,                    │
 │                           │    primaryKey,                 │
 │                           │    new nonce,                   │
 │                           │    plaintext                    │
 │                           │  )                             │
 │                           ├─────────────────────────────►│
 │                           │  ◄── new ciphertext          │
 │                           │                              │
 │                           │  Base64(ciphertext)           │
 │                           │  = new encryptedPayload       │
 │                           │                              │
 │                           │  HMAC-SHA256(                 │
 │                           │    primaryKey,                 │
 │                           │    new encryptedPayload       │
 │                           │  )                             │
 │                           │  = new integrityTag           │
 │                           │                              │
 │                           │  Update Vault object:          │
 │                           │    updatedAt = now()          │
 │                           │    encryptedPayload = new     │
 │                           │    iv = new nonce (hex)       │
 │                           │    integrityTag = new         │
 │                           │                              │
 │                           │  Write to existing file:       │
 │                           │  writable = await              │
 │                           │    fileHandle.createWritable()│
 │                           │  await writable.write(         │
 │                           │    JSON.stringify(vault)       │
 │                           │  )                             │
 │                           │  await writable.close()        │
 │                           ├─────────────────────────────►│
 │       │                   │                              │
 │       │  "Changes saved"  │                              │
 │       │◄──────────────────┤                              │
```

### Flow 4: Lighthouse Backup

```
┌─────────────────────────────────────────────────────────────────┐
│                   LIGHTHOUSE BACKUP FLOW                         │
└─────────────────────────────────────────────────────────────────┘

User                        App                      Lighthouse/IPFS
 │                           │                              │
 │  Click "Backup Now"       │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  Check vault size             │
 │                           │  ┌─> 80 MB → Show warning    │
 │                           │  └─> 100 MB → Reject,        │
 │                           │               suggest Pro    │
 │                           │                              │
 │                           │  Serialize current Vault      │
 │                           │  (already encrypted)          │
 │                           │                              │
 │                           │  Read Lighthouse API key      │
 │                           │  from VaultSettings            │
 │                           │                              │
 │                           │  POST /upload                  │
 │                           │  Body: encrypted vault blob   │
 │                           ├─────────────────────────────►│
 │                           │                              │
 │                           │                      ┌───────┤
 │                           │                      │ Store │
 │                           │                      │ blob  │
 │                           │                      │ on    │
 │                           │                      │ IPFS  │
 │                           │                      └───┬───┤
 │                           │                          │   │
 │                           │  ◄── CID (e.g.,           │   │
 │                           │       QmXxx...xxx)        │   │
 │                           │                          │   │
 │                           │  Store in memory:          │   │
 │                           │  VaultSettings.backupCIDs  │   │
 │                           │    .push({                 │   │
 │                           │      cid,                  │   │
 │                           │      timestamp,            │   │
 │                           │      sizeBytes             │   │
 │                           │    })                      │   │
 │                           │                              │
 │                           │  Save vault (writes          │
 │                           │  updated backupCIDs to      │
 │                           │  the .khurklockd file)       │
 │                           │                              │
 │       │                   │                              │
 │       │  "Backup complete │                              │
 │       │   CID: QmXxx..."  │                              │
 │       │◄──────────────────┤                              │
```

### Flow 5: Lighthouse Restore

```
┌─────────────────────────────────────────────────────────────────┐
│                   LIGHTHOUSE RESTORE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

User                        App                      Lighthouse/IPFS
 │                           │                              │
 │  Click "Restore"          │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  Read backupCIDs from         │
 │                           │  VaultSettings (in vault)     │
 │                           │                              │
 │  ┌──────────────────────┐ │                              │
 │  │ CID list with        │ │                              │
 │  │ timestamps shown     │ │                              │
 │  │ Select one to restore│ │                              │
 │  └──────────┬───────────┘ │                              │
 │             │             │                              │
 │             ├────────────►│                              │
 │                           │                              │
 │                           │  GET /download?cid=QmXxx     │
 │                           ├─────────────────────────────►│
 │                           │                              │
 │                           │                      ┌───────┤
 │                           │                      │ Fetch │
 │                           │                      │ blob  │
 │                           │                      │ from  │
 │                           │                      │ IPFS  │
 │                           │                      └───┬───┤
 │                           │                          │   │
 │                           │  ◄── encrypted blob      │   │
 │                           │                          │   │
 │                           │  blob IS the Vault.json   │   │
 │                           │  (encrypted, never        │   │
 │                           │   decrypted on server)    │   │
 │                           │                              │
 │                           │  Parse JSON → Vault object   │
 │                           │  Extract encryptedPayload,   │
 │                           │  iv, salt, integrityTag      │
 │                           │                              │
 │                           │  Prompt for master password   │
 │                           │  (to verify/decrypt)          │
 │                           │                              │
 │  Enter password          │                              │
 ├──────────────────────────►│                              │
 │                           │                              │
 │                           │  Argon2id(password, salt)     │
 │                           │  → candidateKey               │
 │                           │                              │
 │                           │  Verify HMAC                  │
 │                           │  Decrypt AES-256-GCM          │
 │                           │  → VaultPayload               │
 │                           │                              │
 │  ┌──────────────────────┐ │                              │
 │  │ Merge or Replace?    │ │                              │
 │  │ - Replace: discard   │ │                              │
 │  │   current, use this  │ │                              │
 │  │ - Merge: add missing │ │                              │
 │  │   items from backup  │ │                              │
 │  └──────────┬───────────┘ │                              │
 │             │             │                              │
 │             ├────────────►│                              │
 │                           │                              │
 │                           │  Apply merge/replace          │
 │                           │  Re-encrypt with current key  │
 │                           │  Save to .khurklockd file     │
 │                           │                              │
 │       │                   │                              │
 │       │  "Vault restored  │                              │
 │       │   successfully"   │                              │
 │       │◄──────────────────┤                              │
```

---

## 5. Component Architecture

### 5.1 Overall Architecture

```
khurklockd/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout (metadata, providers)
│   │   ├── page.tsx                  # Landing page (lock icon, CTA)
│   │   ├── (vault)/                  # Route group for authenticated vault
│   │   │   ├── layout.tsx            # Vault shell (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Main dashboard (favorites, recent)
│   │   │   ├── items/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Item detail/edit view
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # New item creation
│   │   │   ├── generator/
│   │   │   │   └── page.tsx          # Password generator
│   │   │   ├── totp/
│   │   │   │   └── page.tsx          # TOTP code viewer
│   │   │   ├── wallet/
│   │   │   │   └── page.tsx          # Digital wallet view
│   │   │   ├── breach/
│   │   │   │   └── page.tsx          # Breach monitoring results
│   │   │   ├── backup/
│   │   │   │   └── page.tsx          # Lighthouse backup/restore
│   │   │   ├── emergency/
│   │   │   │   └── page.tsx          # Emergency access settings
│   │   │   └── settings/
│   │   │       └── page.tsx          # Vault settings
│   │   └── unlock/
│   │       └── page.tsx              # Unlock screen (file picker + password)
│   ├── components/                   # Reusable UI components
│   │   ├── ui/                       # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Switch.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── vault/                    # Vault-specific components
│   │   │   ├── Sidebar.tsx           # Navigation sidebar + lock button
│   │   │   ├── ItemList.tsx          # Filterable, searchable item list
│   │   │   ├── ItemCard.tsx          # Individual item card
│   │   │   ├── ItemForm.tsx          # Create/edit form (login/note/card/identity)
│   │   │   ├── FavoriteToggle.tsx    # Star/unstar toggle
│   │   │   ├── PasswordField.tsx     # Show/hide password with copy button
│   │   │   ├── VaultHeader.tsx       # Vault name, lock status, search bar
│   │   │   └── LockTimer.tsx         # Visual countdown to auto-lock
│   │   ├── crypto/
│   │   │   ├── UnlockForm.tsx        # Master password entry
│   │   │   ├── StrengthMeter.tsx     # Password strength visual indicator
│   │   │   └── FilePicker.tsx        # Drag-and-drop or button file picker
│   │   ├── generator/
│   │   │   ├── GeneratorPanel.tsx    # Password/passphrase generation UI
│   │   │   ├── LengthSlider.tsx      # Slider for password length
│   │   │   └── CharacterToggle.tsx   # Toggle uppercase/lowercase/digits/symbols
│   │   ├── totp/
│   │   │   ├── TOTPDisplay.tsx       # 6-digit code with countdown circle
│   │   │   ├── TOTPSetup.tsx         # QR scan or manual key entry
│   │   │   └── TOTPList.tsx          # List of all TOTP-enabled items
│   │   ├── breach/
│   │   │   ├── BreachBanner.tsx      # Alert banner for breached items
│   │   │   ├── BreachList.tsx        # List of breached items
│   │   │   └── BreachDetail.tsx      # Single breach detail card
│   │   ├── backup/
│   │   │   ├── BackupPanel.tsx       # Upload backup button + CID list
│   │   │   ├── RestorePanel.tsx      # Select CID + restore
│   │   │   └── StorageMeter.tsx      # Visual bar showing storage usage
│   │   ├── emergency/
│   │   │   ├── ContactList.tsx       # List of emergency contacts
│   │   │   ├── AddContactForm.tsx    # Add trusted contact form
│   │   │   └── DeadManSwitch.tsx     # Switch configuration UI
│   │   └── settings/
│   │       ├── SecuritySettings.tsx   # Argon2id params, lock timeout
│   │       ├── AppearanceSettings.tsx # Theme, locale
│   │       └── AboutPanel.tsx        # Version, license, links
│   ├── lib/
│   │   ├── crypto/                   # Cryptographic operations
│   │   │   ├── encryption.ts         # encryptVault, decryptVault
│   │   │   ├── argon2.ts             # deriveKey (WASM Argon2id)
│   │   │   ├── integrity.ts          # computeHMAC, verifyHMAC
│   │   │   └── utils.ts              # hexToBytes, bytesToHex, base64
│   │   ├── vault/                    # Vault lifecycle management
│   │   │   ├── vault-manager.ts      # createVault, openVault, saveVault
│   │   │   ├── items.ts              # addItem, updateItem, deleteItem, searchItems
│   │   │   ├── file-io.ts            # loadFile, saveFile (File System Access API)
│   │   │   ├── lock.ts               # lockVault, startLockTimer, resetLockTimer
│   │   │   └── schema.ts             # Zod schemas for runtime validation
│   │   ├── sync/                     # Lighthouse.Storage integration
│   │   │   ├── lighthouse.ts         # backup, restore, listBackups, getStorageStatus
│   │   │   └── cap.ts                # enforceCap, checkVaultSize
│   │   ├── generator/                # Password generation
│   │   │   ├── password.ts           # generatePassword, generatePassphrase
│   │   │   └── strength.ts           # calculateStrength (zxcvbn or custom)
│   │   ├── totp/                     # TOTP engine
│   │   │   ├── totp.ts               # generateTOTP, verifyTOTP
│   │   │   ├── key.ts                # importKey, parseOTPAuthURL
│   │   │   └── countdown.ts          # getRemainingSeconds
│   │   ├── breach/                   # Breach monitoring
│   │   │   └── breach.ts             # checkBreach, scanVault (HIBP API)
│   │   ├── emergency/                # Emergency access
│   │   │   ├── contacts.ts           # addContact, removeContact
│   │   │   └── deadman.ts            # checkDeadManSwitch, armSwitch
│   │   ├── hooks/                    # React hooks
│   │   │   ├── useVault.ts           # Vault state hook (context provider)
│   │   │   ├── useClipboard.ts       # Copy + auto-clear hook
│   │   │   ├── useLockTimer.ts       # Auto-lock timer hook
│   │   │   ├── useTOTP.ts            # TOTP generation + countdown hook
│   │   │   ├── useBreach.ts          # Breach check hook
│   │   │   └── useFilePicker.ts      # File System Access API hook
│   │   ├── context/                  # React context providers
│   │   │   ├── VaultContext.tsx       # Vault state + dispatch
│   │   │   └── ThemeContext.tsx       # Theme state
│   │   └── types/
│   │       └── index.ts              # All TypeScript type definitions
│   └── ...
├── docs/
│   └── ARCHITECTURE.md               # This document
├── tests/                            # Test directory
│   ├── unit/
│   │   ├── crypto/
│   │   │   ├── encryption.test.ts
│   │   │   ├── argon2.test.ts
│   │   │   └── integrity.test.ts
│   │   ├── vault/
│   │   │   ├── vault-manager.test.ts
│   │   │   ├── items.test.ts
│   │   │   └── schema.test.ts
│   │   ├── generator/
│   │   │   ├── password.test.ts
│   │   │   └── strength.test.ts
│   │   ├── totp/
│   │   │   ├── totp.test.ts
│   │   │   └── key.test.ts
│   │   └── breach/
│   │       └── breach.test.ts
│   ├── integration/
│   │   ├── vault-flow.test.ts        # Create → unlock → edit → save
│   │   ├── backup-flow.test.ts       # Backup → restore
│   │   └── breach-scan.test.ts
│   └── components/                   # Component tests
│       ├── UnlockForm.test.tsx
│       ├── ItemForm.test.tsx
│       └── GeneratorPanel.test.tsx
├── vitest.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── AGENTS.md
```

### 5.2 Module Responsibilities

#### 5.2.1 `src/lib/crypto/encryption.ts`

```
Exports:
  encryptVault(payload: VaultPayload, key: CryptoKey): Promise<{ encryptedPayload: string; iv: string }>
  decryptVault(encryptedPayload: string, iv: string, key: CryptoKey): Promise<VaultPayload>

Behavior:
  - encryptVault serializes VaultPayload to JSON, encodes to UTF-8 bytes,
    generates a fresh 12-byte nonce via crypto.getRandomValues(),
    calls crypto.subtle.encrypt with AES-GCM, Base64-encodes the result.
  - decryptVault Base64-decodes the encryptedPayload, hex-decodes the IV,
    calls crypto.subtle.decrypt, decodes the result via TextDecoder,
    parses JSON, and returns the VaultPayload object.
  - Both functions are pure — no side effects, no logging.

Errors:
  - encryptVault throws on serialization failure or crypto error.
  - decryptVault throws OperationError on wrong key/corruption.
```

#### 5.2.2 `src/lib/crypto/argon2.ts`

```
Exports:
  deriveKey(password: string, salt: Uint8Array, config: Argon2Config): Promise<CryptoKey>

Where:
  Argon2Config = { iterations: number; memory: number; parallelism: number }

Behavior:
  - Normalizes password to Unicode NFC.
  - Calls hash-wasm's argon2id() function with { password, salt, iterations,
    memory, parallelism, hashLength: 32, outputType: 'binary' }.
  - Imports the raw 32-byte output as a non-extractable AES-GCM CryptoKey
    via crypto.subtle.importKey("raw", derivedBytes, "AES-GCM", false, ["encrypt", "decrypt"]).
  - Also imports as an HMAC key for integrity checks.

Implementation note:
  hash-wasm (or @aspect-build/argon2) compiles Argon2id to WebAssembly.
  The WASM module is loaded once and cached. The argon2id call is wrapped
  in a Web Worker to avoid blocking the main thread. A fallback to a pure-JS
  implementation (slower) is included for environments without WASM support.
```

#### 5.2.3 `src/lib/vault/vault-manager.ts`

```
State (module-scoped):
  let activeVault: VaultPayload | null = null;
  let fileHandle: FileSystemFileHandle | null = null;
  let primaryKey: CryptoKey | null = null;
  let lockTimerId: number | null = null;

Exports:
  createVault(password, settings?, filename?): Promise<FileSystemFileHandle>
  openVault(): Promise<VaultPayload>
  saveVault(): Promise<void>
  isUnlocked(): boolean
  getActiveVault(): VaultPayload (throws if locked)

Behavior:
  - createVault: derives key, creates empty VaultPayload with default settings,
    encrypts, constructs Vault object, opens Save File Picker, writes to file,
    stores fileHandle, sets activeVault and primaryKey, starts lock timer.
  - openVault: opens Open File Picker, reads file, verifies HMAC, prompts for
    password, derives key, decrypts, stores state, starts lock timer.
  - saveVault: re-encrypts activeVault with fresh nonce, updates Vault object,
    writes to fileHandle.
```

#### 5.2.4 `src/lib/vault/file-io.ts`

```
Exports:
  loadFile(): Promise<{ vault: Vault; handle: FileSystemFileHandle }>
  saveFile(vault: Vault, handle: FileSystemFileHandle): Promise<void>
  pickNewFile(): Promise<FileSystemFileHandle>

Behavior:
  - Tries File System Access API (showOpenFilePicker / showSaveFilePicker).
  - Falls back to <input type="file"> + download link for browsers without
    File System Access API support (Firefox, Safari).
  - Fallback: loadFile creates a temporary input, reads the file as text,
    returns { vault: JSON.parse(text), handle: null }.
  - Fallback: saveFile creates a Blob, generates a download link,
    auto-clicks it. User must manually replace their file.
  - Uses .khurklockd extension filter in picker.
```

#### 5.2.5 `src/lib/sync/lighthouse.ts`

```
Exports:
  backup(vault: Vault, apiKey: string): Promise<string>      // returns CID
  restore(cid: string, apiKey: string): Promise<Vault>       // returns encrypted Vault
  listBackups(apiKey: string): Promise<BackupRecord[]>
  getStorageStatus(apiKey: string): Promise<{ usedBytes: number; capBytes: number }>

Behavior:
  - backup: JSON-serializes the already-encrypted Vault object, uploads via
    Lighthouse SDK uploadEncrypted(). Returns the CID string.
  - restore: Downloads via Lighthouse SDK downloadEncrypted(cid, apiKey).
    Returns the raw encrypted Vault object — decryption is handled by vault-manager.
  - listBackups: Reads backupCIDs from activeVault.settings. Does NOT query
    Lighthouse for a list (Lighthouse does not index by user — CIDs must be
    tracked locally).
  - getStorageStatus: Lighthouse SDK does not natively expose storage quota.
    Implementation tracks total uploaded bytes in VaultSettings and compares
    against the 100 MB cap client-side.
  - enforces 100 MB cap before upload: if vault size + existing uploads > 100 MB,
    rejects with an error message suggesting upgrade or cleanup.
```

#### 5.2.6 `src/lib/generator/password.ts`

```
Exports:
  generatePassword(config: GeneratorConfig): string
  generatePassphrase(config: PassphraseConfig): string

Where:
  GeneratorConfig = {
    length: number;                // 8–128, default 20
    uppercase: boolean;            // default true
    lowercase: boolean;            // default true
    digits: boolean;               // default true
    symbols: boolean;              // default true
    excludeAmbiguous: boolean;     // default true (I, l, 1, O, 0)
    minOfEach: number;             // default 1
  }
  PassphraseConfig = {
    wordCount: number;             // 3–10, default 5
    separator: string;             // default "-"
    capitalize: boolean;           // default false
    includeNumber: boolean;        // default false
    wordList: 'eff-large' | 'eff-short' | 'bip39';
  }

Behavior:
  - Uses crypto.getRandomValues() for entropy. No Math.random().
  - Character generation: builds pool string from selected character sets,
    shuffles via Fisher-Yates with CSPRNG, picks required minimums of each
    set, fills remainder randomly.
  - Passphrase: loads a word list (EFF large: 7,776 words, ~12.9 bits/word),
    picks wordCount words via CSPRNG, joins with separator.
```

#### 5.2.7 `src/lib/generator/strength.ts`

```
Exports:
  calculateStrength(password: string): StrengthResult

Where:
  StrengthResult = {
    score: 0 | 1 | 2 | 3 | 4;  // 0=very weak, 4=very strong
    guessTime: string;          // "centuries", "3 hours", etc.
    feedback: { warning: string; suggestions: string[] };
  }

Behavior:
  - Uses zxcvbn (Dropbox's password strength estimator) for entropy estimation.
  - zxcvbn analyzes against common passwords, English words, names, dates,
    keyboard patterns, repeating patterns, and sequences.
  - Score mapping: 0 = crackable instantly, 1 = crackable in < 1 day,
    2 = crackable in < 1 month, 3 = crackable in < 1 year, 4 = centuries.
  - Returns human-readable crack time and actionable feedback.
```

#### 5.2.8 `src/lib/totp/totp.ts`

```
Exports:
  generateTOTP(secret: Uint8Array, period?: number, digits?: number): Promise<string>
  verifyTOTP(token: string, secret: Uint8Array, period?: number, digits?: number): Promise<boolean>

Behavior:
  - Implements RFC 6238 (TOTP) and RFC 4226 (HOTP).
  - Defaults: period = 30 seconds, digits = 6.
  - Computes counter = floor(currentUnixTime / period).
  - Converts counter to 8-byte big-endian buffer.
  - Computes HMAC-SHA1(secret, counterBuffer) via Web Crypto.
  - Dynamic truncation per RFC 4226 section 5.3.
  - Returns zero-padded decimal string.
  - verifyTOTP: generates expected TOTP for current time, and optionally
    for ±1 time step (to account for clock skew). Compares in constant time.
```

#### 5.2.9 `src/lib/totp/key.ts`

```
Exports:
  importKey(base32Key: string): Uint8Array
  parseOTPAuthURL(url: string): { secret: Uint8Array; label: string; issuer: string; algorithm: string; digits: number; period: number }

Behavior:
  - importKey: decodes RFC 4648 Base32 (with padding) to raw bytes.
    Implements base32 alphabet: A-Z and 2-7. Handles lowercase, spaces, hyphens.
  - parseOTPAuthURL: parses otpauth://totp/... URIs (from QR codes).
    Extracts all parameters per the Google Authenticator key URI format.
  - QR scanning: delegates to a browser QR scanner library (e.g., jsQR or
    the Barcode Detection API where available). QR scanning happens in a
    <video> element with camera access.
```

#### 5.2.10 `src/lib/breach/breach.ts`

```
Exports:
  checkBreach(emailOrUsername: string): Promise<BreachResult[]>
  scanVault(vault: VaultPayload): Promise<Map<string, BreachResult[]>>

Where:
  BreachResult = {
    name: string;            // "Adobe", "LinkedIn", etc.
    domain: string;
    breachDate: string;
    addedDate: string;
    dataClasses: string[];   // ["Email addresses", "Passwords", ...]
    description: string;
    pwnCount: number;
    isVerified: boolean;
    isSensitive: boolean;
  }

Behavior:
  - Uses the HaveIBeenPwned (HIBP) v3 API with k-anonymity model.
  - checkBreach: SHA-1 hashes the email, sends first 5 hex chars to
    https://api.pwnedpasswords.com/range/{prefix}, receives suffix list,
    checks locally for full hash match. No plaintext email sent to server.
  - scanVault: extracts all unique emails/usernames from vault items,
    batches requests (1.5-second delay between requests per HIBP rate limit),
    returns a map of vault item ID to array of breaches.
  - Results are cached in IndexedDB for 24 hours to avoid repeated API calls.
  - User must click "Scan Now" — no automatic/background scanning without consent.
```

#### 5.2.11 `src/lib/emergency/contacts.ts`

```
Exports:
  addContact(contact: EmergencyContact): void
  removeContact(id: string): void
  getContacts(): EmergencyContact[]

Where:
  EmergencyContact = {
    id: string;
    name: string;
    email: string;
    publicKey: string;         // Their PGP public key (for encrypted delivery)
    accessDelay: number;       // Hours before access is granted (min: 24)
    status: 'pending' | 'active' | 'revoked';
    createdAt: string;
  }
```

#### 5.2.12 `src/lib/emergency/deadman.ts`

```
Exports:
  armSwitch(config: DeadManSwitchConfig): void
  disarmSwitch(): void
  checkDeadManSwitch(): Promise<void>
  getSwitchStatus(): DeadManSwitchStatus

Where:
  DeadManSwitchConfig = {
    checkInterval: number;     // Days between check-ins (default: 7)
    gracePeriod: number;       // Days after missed check-in (default: 3)
    contacts: string[];        // Contact IDs to notify
    message: string;           // Custom message for contacts
  }

Behavior:
  - An armed switch stores the last check-in timestamp in localStorage
    and VaultSettings.
  - checkDeadManSwitch is called on vault unlock. If (now - lastCheckIn) >
    (checkInterval + gracePeriod), the switch triggers.
  - When triggered: encrypts the vault's keySalt and Lighthouse CID with
    each contact's PGP public key, then queues an email (via the user's
    connected Gmail, if available) with instructions + encrypted blob.
  - Each contact receives only their own encrypted shard — no single contact
    can decrypt the vault alone (future: Shamir's Secret Sharing for m-of-n).
```

---

## 6. Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js (App Router) | 15.x | Server components for static pages (landing, docs); client components for vault operations. Built-in routing, code splitting, and Turbopack bundling. |
| **UI Library** | React | 19.x | Required by Next.js 15. Concurrent features, `use` hook, Server Components. |
| **Language** | TypeScript | 5.x (strict mode) | Full type safety for cryptographic operations and vault state. Strict null checks, no implicit any. |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS with `@theme` directives for design tokens. Dark-first palette, CSS-based configuration (no `tailwind.config.js` required in v4). |
| **Cryptography** | Web Crypto API (SubtleCrypto) | Browser native | AES-256-GCM encryption/decryption, HMAC-SHA256. Hardware-accelerated, non-extractable keys. No external crypto library for AES/GCM — browser built-in. |
| **Key Derivation** | hash-wasm | 2.x | Argon2id WebAssembly implementation. 5-10x faster than pure JS. Used ONLY for Argon2id — not for AES or HMAC. No native Node dependency. |
| **Validation** | zod | 3.x | Runtime schema validation for vault file parsing, API responses, user input. Type inference from schemas (z.infer). |
| **Password Strength** | zxcvbn | 4.x | Dropbox's password strength estimator. Analyzes entropy, patterns, and common passwords. |
| **IPFS Backup** | @lighthouse-web3/sdk | latest | Official Lighthouse.Storage SDK. Handles upload/download with API key auth. |
| **Testing** | Vitest | 2.x | Vite-native test runner. Fast, TypeScript-first, compatible with Jest assertions. |
| **Component Testing** | React Testing Library | 16.x | DOM-based component testing. User-centric queries. |
| **Linting** | ESLint | 9.x | Next.js default config + security rules (no-console, no-eval). |
| **Formatting** | Prettier | 3.x | Consistent code style. Integrated with ESLint. |
| **Build** | Turbopack | Next.js built-in | Rust-based bundler, significantly faster than Webpack. Default in Next.js 15. |
| **TOTP** | Custom (Web Crypto) | — | No external TOTP library needed. HMAC-SHA1 via Web Crypto API. RFC 6238/4226 implemented in <200 lines. |
| **QR Scanning** | jsQR | latest | Pure JS QR code reader. No WASM dependency. Fallback to Barcode Detection API where available. |
| **QR Generation** | qrcode | latest | Generates QR codes for TOTP setup export. |
| **File Picker** | File System Access API | Browser native | showOpenFilePicker / showSaveFilePicker for native-like file dialogs. Fallback: `<input type="file">`. |
| **Session Cache** | IndexedDB | Browser native | Stores vault metadata (file path, last opened, backup CIDs) across sessions. Never stores plaintext. |
| **Internationalization** | next-intl | latest | i18n routing, message extraction, locale detection. |
| **CI/CD** | GitHub Actions | — | Build + test + lint on PRs. Deploy docs to GitHub Pages. |
| **Hosting** | Vercel / Netlify | — | Static export compatible (no server needed — all logic is client-side). |

### 6.1 Dependency Philosophy

- **Minimize dependencies** in the cryptographic path. AES, HMAC, and RNG all use browser-native Web Crypto API — no npm packages in the encryption pipeline.
- **Argon2id is the one exception**: browsers do not implement Argon2id natively (only PBKDF2). hash-wasm is the most audited, minimal WASM implementation.
- **No Node.js server required.** The app builds to static files. All vault operations run in the browser.
- **Lockfile committed.** `package-lock.json` with `lockfileVersion: 3` checked into git with exact versions. Dependabot configured for automated updates.
- **Subresource integrity (SRI)** for any CDN-loaded assets (future: verify hash-wasm WASM binary).

---

## 7. Competitor Feature Comparison Matrix

| Feature | Khurklockd | 1Password | Dashlane | LastPass | Bitwarden | Notes |
|---------|-----------|-----------|----------|----------|-----------|-------|
| **Local-first vault file** | Yes | No | No | No | Partial | Bitwarden supports self-hosted server; Khurklockd is purely file-based. No server at all. |
| **Zero-knowledge architecture** | Yes | Yes | Yes | Partial | Yes | LastPass had plaintext leakage incidents (2022 breach). |
| **AES-256-GCM encryption** | Yes | Yes | Yes | Yes | Yes | All major competitors use AES-256. Khurklockd uses GCM mode. |
| **Argon2 key derivation** | Yes | No (PBKDF2) | No (PBKDF2) | No (PBKDF2) | Yes (Argon2id) | Bitwarden adopted Argon2id in 2023. 1Password uses PBKDF2 + Secret Key. |
| **File-based vault (.khurklockd)** | Yes | No | No | No | No | Unique differentiator — vault is a portable file you own. |
| **Optional IPFS backup (Lighthouse)** | Yes | No | No | No | No | Unique differentiator — decentralized, censorship-resistant backup. |
| **TOTP built-in** | Yes | Yes | Yes | Yes | Yes (Premium) | Bitwarden requires Premium for TOTP. |
| **Breach monitoring** | Yes | Yes (Watchtower) | Yes | Yes | Yes (Premium) | Khurklockd uses HIBP k-anonymity; Bitwarden requires Premium. |
| **Emergency access** | Yes | Yes (Family) | Yes | Yes | Yes (Premium) | Khurklockd's Dead Man's Switch is unique — time-based, contact-triggered. |
| **Digital wallet** | Yes | Yes | Yes | Yes | Yes | Card/identity storage in all competitors. |
| **Password generator** | Yes | Yes | Yes | Yes | Yes | Table stakes feature. |
| **Open source** | TBD | No | No | No | Yes | Bitwarden is GPLv3. Khurklockd license TBD — considering AGPLv3 or Business Source License. |
| **Free tier** | Yes (full) | Limited (no sharing) | Limited (1 device) | Limited (1 device type) | Yes (full) | Khurklockd free tier includes ALL features except Lighthouse backup. |
| **Browser extension** | Planned (Phase 3) | Yes | Yes | Yes | Yes | All competitors have mature browser extensions. Khurklockd plans basic auto-fill. |
| **Offline access** | Yes (always) | Yes (cached) | Yes (cached) | Yes (cached) | Yes | Khurklockd is offline-first by design. Others cache but require periodic sync. |
| **Desktop app** | Web app (PWA) | Yes (native) | Yes (native) | Yes (native) | Yes (native) | Khurklockd is a web app; PWA for offline. No Electron wrapper planned. |
| **Mobile app** | PWA (Phase 4) | Yes (native) | Yes (native) | Yes (native) | Yes (native) | PWA approach avoids app store overhead. |
| **Biometric unlock** | Planned (Phase 4) | Yes | Yes | Yes | Yes | Web Authentication API (WebAuthn) for fingerprint/face unlock. |
| **Import from competitors** | Planned (Phase 4) | Yes | Yes | Yes | Yes | CSV/JSON import from 1Password, LastPass, Bitwarden, Dashlane export formats. |
| **Shared vaults** | Planned (Business) | Yes (Family/Business) | Yes (Business) | Yes (Family/Business) | Yes (Organization) | Business tier feature. |
| **SAML/SSO** | Planned (Business) | Yes (Business) | Yes (Business) | Yes (Business) | Yes (Enterprise) | Business tier feature. |
| **Admin dashboard** | Planned (Business) | Yes (Business) | Yes (Business) | Yes (Business) | Yes (Enterprise) | Business tier feature. |
| **Audit logs** | Planned (Business) | Yes (Business) | Yes (Business) | Yes (Business) | Yes (Enterprise) | Business tier feature. |
| **Travel mode** | Planned | Yes | No | No | No | Remove sensitive items from device when traveling. |
| **Watchtower / Security Dashboard** | Yes (breach) | Yes (Watchtower) | Yes | Yes (Security Dashboard) | Yes | Breach alerts + password health reports. |
| **Duress password** | Planned | No | No | No | No | Decoy vault with alternate master password. |

---

## 8. Development Roadmap

### Phase 1 — MVP: Core Vault (Weeks 1–4)

**Goal:** A working, local-only password manager that can create, open, edit, and save encrypted vault files.

| Week | Deliverables |
|------|-------------|
| 1 | Argon2id key derivation module (`deriveKey`). AES-256-GCM encrypt/decrypt module. HMAC-SHA256 integrity module. Unit tests for all crypto. |
| 2 | VaultManager: `createVault`, `openVault`, `saveVault`. File I/O module (File System Access API + fallback). Lock/unlock flow. VaultPayload type definitions. |
| 3 | Password generator module (generatePassword, generatePassphrase, calculateStrength). Item CRUD (addItem, updateItem, deleteItem, toggleFavorite, searchItems). |
| 4 | Basic UI: UnlockScreen (file picker + password), Dashboard (sidebar + item list + search), ItemDetail (view mode), ItemEditor (create/edit form), PasswordGenerator page. Landing page. |

**Exit criteria:** End-to-end flow works — create vault, add logins/notes, save, close, reopen, unlock, view items. Build passes. 80%+ test coverage on crypto modules.

### Phase 2 — TOTP, Wallet, Breach, Backup (Weeks 5–8)

**Goal:** Feature-complete personal password manager with backup.

| Week | Deliverables |
|------|-------------|
| 5 | TOTP engine: key import (Base32), code generation, countdown, QR scanning for setup. TOTPView UI. |
| 6 | Digital wallet UI (card/identity views). Lighthouse.Storage integration: backup upload, restore download, CID tracking, 100 MB cap enforcement. BackupPanel + RestorePanel UI. |
| 7 | Breach monitoring module: HIBP k-anonymity API, vault scan, breach alert UI. BreachBanner + BreachList components. |
| 8 | Settings page: security (Argon2id params, lock timeout, clipboard), appearance (theme, locale), about. Storage meter. Integration tests for backup/restore flow. |

**Exit criteria:** All Phase 2 features work end-to-end. Lighthouse backup/restore verified with real API key. Breach scanning tested against known-breached email.

### Phase 3 — Emergency Access, Sharing, Extension (Weeks 9–14)

**Goal:** Trusted emergency access, basic sharing, browser extension for auto-fill.

| Week | Deliverables |
|------|-------------|
| 9–10 | Emergency access: trusted contacts CRUD, PGP key import, Dead Man's Switch (arm/disarm/check). Email notification via connected Gmail. |
| 11–12 | Item sharing: generate share link (encrypted with recipient's public key), accept share, revoke share. |
| 13–14 | Browser extension (Chrome/Edge, Manifest V3): auto-fill detection, inline injection, keyboard shortcut, popup with quick search. Communication between extension and web app via `postMessage`. |

**Exit criteria:** Emergency contact can receive and decrypt access. Share link works end-to-end. Browser extension fills username/password on at least 5 major sites.

### Phase 4 — Polish, Mobile, Import/Export, Accessibility (Weeks 15–20)

**Goal:** Production-ready release with PWA, competitor import, and WCAG compliance.

| Week | Deliverables |
|------|-------------|
| 15–16 | PWA: service worker, offline cache, install prompt, push notifications (for breach alerts). Mobile-responsive layout. Biometric unlock via WebAuthn (fingerprint/face). |
| 17–18 | Import from 1Password (1pux/CSV), Bitwarden (JSON/CSV), LastPass (CSV), Dashlane (CSV). Export to encrypted JSON (for migration between Khurklockd vaults). |
| 19 | Accessibility audit: WCAG 2.1 AA compliance. Keyboard navigation, screen reader support, color contrast, focus management. |
| 20 | Performance optimization: code splitting, lazy loading, Lighthouse audit score > 90. Load testing with 10,000-item vault. Final documentation: README, user guide, security whitepaper. |

**Exit criteria:** Lighthouse audit score >= 90. WCAG 2.1 AA verified. Import from all 4 competitors tested. PWA installs and works offline.

---

## 9. Monetization Strategy

### 9.1 Free Tier — "Khurklockd Free"

| Feature | Included |
|---------|----------|
| Vault items | Unlimited |
| Local vault file | Unlimited |
| Password generator | Full |
| TOTP codes | Full |
| Breach monitoring | Manual scan (click to scan) |
| Digital wallet | Full |
| Themes | Dark + Light |
| Auto-lock | Full |
| Clipboard management | Full |

**Value proposition:** A complete, fully-featured password manager that costs nothing and respects privacy. The free tier is genuinely useful — it is not crippled.

### 9.2 Pro Tier — "Khurklockd Pro" ($3/month or $30/year)

| Feature | Details |
|---------|---------|
| Lighthouse encrypted backup | 100 MB storage on IPFS via Lighthouse |
| Emergency access | Trusted contacts + Dead Man's Switch |
| Priority support | Email support, 24-hour response |
| Breach monitoring | Automatic weekly scan (background) |
| Future: Duress password | Decoy vault with alternate master password |
| Future: Travel mode | Remove sensitive items temporarily |

**Value proposition:** Backup + peace of mind. The backup is the primary conversion driver — users who want offsite backup need Pro.

### 9.3 Business Tier — "Khurklockd Business" ($5/user/month, minimum 5 users)

| Feature | Details |
|---------|---------|
| Everything in Pro | Per-user |
| Shared vaults | Team-wide shared vaults with permissions (read/write/admin) |
| Admin dashboard | User management, vault health, breach status |
| Audit logs | Who accessed what and when |
| SAML/SSO | Okta, Azure AD, Google Workspace |
| Enforced policies | Minimum password length, mandatory 2FA, lock timeout |
| Priority support | Dedicated account manager, 4-hour response |

### 9.4 Revenue Model Notes

- **No ads. No data mining. No tracking.** Monetization is through subscriptions only.
- **Lighthouse.Storage costs:** 100 MB of IPFS storage is inexpensive. At ~$0.05/GB/month for IPFS pinning, 100 MB costs ~$0.005/month per user. Even at scale, infrastructure costs are minimal.
- **Payment processing:** Stripe (or similar). No crypto payments in MVP.
- **Free trial:** 14-day Pro trial for new users. No credit card required.
- **Open source vs. business model:** If licensed under AGPLv3, businesses can self-host. The Business tier targets companies that prefer managed services. Alternatively, Business Source License (BSL) that converts to open source after 4 years.

---

## 10. Regulatory Compliance

### 10.1 GDPR (General Data Protection Regulation)

| Requirement | How Khurklockd Complies |
|-------------|------------------------|
| **Data storage in EU** | No personal data stored on servers. Vault files live on the user's device. Lighthouse (IPFS) nodes may be anywhere — but vault data is encrypted client-side (AES-256-GCM). Even if stored on an IPFS node in the EU, the node operator has no access to plaintext. |
| **Right to access** | User has full access to their data — it's a file on their device. They can open, view, and export it at any time. |
| **Right to deletion** | User deletes their local `.khurklockd` file. For Lighthouse backup: user can unpin CIDs via the Lighthouse dashboard or API. The backup panel includes a "Delete Backup" button that calls Lighthouse unpin. |
| **Right to portability** | Vault file is portable JSON. Export to CSV/JSON is built-in (Phase 4). |
| **Data Protection Officer (DPO)** | Not required — Khurklockd (Khurk Services) does not process personal data on its servers. All processing is client-side. |
| **Data Processing Agreement (DPA)** | Not required — Khurk Services is not a data processor. The user is the data controller. Lighthouse.Storage is a storage provider of encrypted blobs; a DPA can be provided if needed. |
| **Breach notification** | If a Lighthouse vulnerability is discovered, affected users are notified via email (if Pro) or in-app notification within 72 hours. Since only encrypted data is on Lighthouse, a breach of the IPFS node would not expose plaintext. |
| **Privacy by design** | Core architecture principle. Zero-knowledge. Local-first. Client-side encryption. No telemetry. No analytics (or opt-in only). |

### 10.2 CCPA (California Consumer Privacy Act)

| Requirement | How Khurklockd Complies |
|-------------|------------------------|
| **Right to know** | Khurklockd collects no personal information. No data is sold. No data is shared. The privacy policy explicitly states this. |
| **Right to delete** | Same as GDPR — delete local vault file. Unpin Lighthouse CIDs. |
| **Right to opt-out of sale** | No data is sold. Nothing to opt out of. |
| **Non-discrimination** | Free tier is fully-featured. No features are withheld for exercising privacy rights. |

### 10.3 HIPAA / Healthcare Data

- Khurklockd is **not HIPAA-compliant** out of the box. Users storing PHI (Protected Health Information) do so at their own risk.
- The encryption is strong enough for PHI (AES-256-GCM is HIPAA-compliant encryption), but no BAA (Business Associate Agreement) is offered.
- If HIPAA compliance is desired in the future: a dedicated HIPAA mode with stricter lock policies, audit logging, and BAA would be a Business tier add-on.

### 10.4 Export Compliance (US EAR/ITAR)

- **AES-256-GCM encryption:** Mass-market exemption (EAR99). Khurklockd's encryption is implemented via browser-native Web Crypto API — no custom encryption software is distributed.
- **No export restrictions apply.** The app is distributed as source code and static web assets. It does not contain encryption code beyond what is available in every modern web browser.
- The ECCN (Export Control Classification Number) for Khurklockd is **EAR99** — no license required.

### 10.5 Accessibility (WCAG 2.1)

- Target: **WCAG 2.1 Level AA** compliance (Phase 4, Week 19).
- All interactive elements are keyboard-accessible (Tab, Enter, Escape, arrow keys).
- Focus indicators visible and contrast-compliant.
- Screen reader support via ARIA labels, roles, and live regions.
- Color contrast ratios: 4.5:1 minimum for text, 3:1 for large text and UI components.
- Dark theme tested against WCAG contrast requirements.

### 10.6 Security Certifications (Future)

- **SOC 2 Type II:** Applicable if/when Khurk Services offers managed vault hosting (Business tier server component). Not applicable to client-side MVP.
- **ISO 27001:** Long-term goal for the organization. Not required for MVP.
- **Third-party security audit:** Planned after Phase 3. Engage a cryptography/security firm to audit the encryption implementation, key handling, and Argon2id integration.

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Argon2id** | Memory-hard password hashing function (RFC 9106). Resistant to GPU and side-channel attacks. |
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit key in Galois/Counter Mode. Provides authenticated encryption. |
| **CID** | Content Identifier — a cryptographic hash that uniquely identifies content on IPFS (e.g., `QmXxx...`). |
| **CSPRNG** | Cryptographically Secure Pseudo-Random Number Generator. In browsers: `crypto.getRandomValues()`. |
| **Dead Man's Switch** | A mechanism that triggers an action if the user fails to check in within a specified time period. |
| **File System Access API** | Browser API that allows web apps to read and write files on the user's local filesystem with user permission. |
| **HMAC-SHA256** | Hash-based Message Authentication Code using SHA-256. Used for integrity verification. |
| **HIBP** | Have I Been Pwned — a breach notification service by Troy Hunt. Uses k-anonymity for privacy-preserving checks. |
| **k-anonymity** | Privacy model where a query reveals only the first 5 characters of a SHA-1 hash, so the server cannot determine the original value. |
| **Lighthouse.Storage** | IPFS-based decentralized storage with per-file encryption and API key access. |
| **Nonce** | "Number used once" — a random value used as an initialization vector (IV) in encryption to ensure uniqueness. |
| **OTPAuth URL** | Standard URI format (`otpauth://totp/...`) for encoding TOTP setup parameters, commonly shared as QR codes. |
| **PBKDF** | Password-Based Key Derivation Function. Argon2id and PBKDF2 are examples. |
| **PWA** | Progressive Web App — a web app that can be installed on a device and work offline. |
| **SHA-256** | Secure Hash Algorithm producing a 256-bit (32-byte) digest. Used in HMAC. |
| **TOTP** | Time-based One-Time Password (RFC 6238). Generates a 6-8 digit code that changes every 30 seconds. |
| **Vault** | The encrypted `.khurklockd` file containing all password items and settings. |
| **VaultPayload** | The decrypted inner structure of a Vault — the items array and settings object. |
| **Web Crypto API** | Browser-native cryptographic API (`crypto.subtle`) providing AES, HMAC, key generation, and more. |
| **Zero-Knowledge** | Architecture where the service provider has no access to user plaintext data. Encryption/decryption happens only on the client. |

---

## Appendix B: References

1. **Argon2 RFC 9106:** https://datatracker.ietf.org/doc/rfc9106/
2. **AES-GCM NIST SP 800-38D:** https://csrc.nist.gov/publications/detail/sp/800-38d/final
3. **HMAC RFC 2104:** https://datatracker.ietf.org/doc/rfc2104/
4. **TOTP RFC 6238:** https://datatracker.ietf.org/doc/rfc6238/
5. **HOTP RFC 4226:** https://datatracker.ietf.org/doc/rfc4226/
6. **Web Crypto API:** https://www.w3.org/TR/WebCryptoAPI/
7. **File System Access API:** https://wicg.github.io/file-system-access/
8. **OWASP Password Storage Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
9. **Have I Been Pwned API v3:** https://haveibeenpwned.com/API/v3
10. **Lighthouse.Storage Docs:** https://docs.lighthouse.storage/
11. **WCAG 2.1:** https://www.w3.org/TR/WCAG21/
12. **zxcvbn (Dropbox):** https://github.com/dropbox/zxcvbn
13. **hash-wasm:** https://github.com/Daninet/hash-wasm
14. **Key URI Format (Google Authenticator):** https://github.com/google/google-authenticator/wiki/Key-Uri-Format
15. **GDPR:** https://gdpr.eu/
16. **CCPA:** https://oag.ca.gov/privacy/ccpa
