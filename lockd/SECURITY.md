# Khurklockd — Security Policy

**Last Updated:** 2026-05-13
**Version:** 1.0.0

---

## Table of Contents

1. [Security Model](#1-security-model)
2. [Threat Model](#2-threat-model)
3. [What Is Protected](#3-what-is-protected)
4. [What Is Not Protected](#4-what-is-not-protected)
5. [Encryption Details](#5-encryption-details)
6. [Key Management](#6-key-management)
7. [Memory Security](#7-memory-security)
8. [Losing Your Master Password](#8-losing-your-master-password)
9. [Responsible Disclosure](#9-responsible-disclosure)
10. [Security Audit History](#10-security-audit-history)
11. [Vulnerability Reporting](#11-vulnerability-reporting)

---

## 1. Security Model

Khurklockd is a **local-first, zero-knowledge** password manager. This means:

- **Local-first.** All data processing — encryption, decryption, key derivation, and vault management — happens in your browser. No backend server is involved in cryptographic operations.
- **Zero-knowledge.** The developers and any infrastructure providers have zero access to your plaintext data. Your master password is never transmitted. Your derived encryption keys are never exported.
- **Portable vault.** Your vault is a single `.khurklockd` file on your local filesystem. You control where it lives — local disk, USB drive, or synced via cloud storage (Dropbox, Google Drive, iCloud, etc.).

### Trust Boundaries

```
                 Trusted Zone                       Untrusted Zone
┌─────────────────────────────────────┐    ┌──────────────────────────┐
│  Your Browser                       │    │  Cloud Storage Provider   │
│  ┌───────────────────────────────┐  │    │                          │
│  │  Master Password (transient)  │  │    │  .khurklockd file (AES-   │
│  │  Argon2id Key Derivation      │  │    │  256-GCM ciphertext only) │
│  │  AES-256-GCM Decryption       │  │    │                          │
│  │  Plaintext Vault (in memory)  │  │    └──────────────────────────┘
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                  |
                  | HMAC-SHA256 integrity tag protects against tampering
                  | AES-256-GCM authentication tag protects against forgery
                  v
          Any storage medium
```

---

## 2. Threat Model

### Adversaries Considered

| Adversary | Capability | Status |
|-----------|-----------|--------|
| Attacker with stolen vault file | May attempt offline brute-force | **Mitigated** — Argon2id (64 MiB) makes GPU brute-force infeasible |
| Malicious browser extension | Can read DOM and JS heap | **Partially mitigated** — auto-lock minimizes exposure window; CSP headers restrict extension access |
| Cloud storage provider | Has access to the `.khurklockd` file | **Mitigated** — file is always AES-256-GCM encrypted; provider sees only ciphertext |
| Network eavesdropper | Can intercept network traffic | **Mitigated** — no plaintext data is ever transmitted; optional sync transmits only ciphertext |
| Physical access to unlocked device | User walks away from computer | **Partially mitigated** — auto-lock timer (default 5 min); manual lock via keyboard shortcut |
| Malware on user's machine | Keylogger, screen capture, clipboard scraper | **Out of scope** — no JavaScript defense against OS-level compromise |
| Browser zero-day | Browser itself is compromised | **Out of scope** — all web apps are vulnerable |
| Side-channel attacks | Timing, power analysis, electromagnetic | **Out of scope** — not practical to defend in a browser-based app |
| Supply chain attack on npm dependencies | Malicious package in dependency tree | **Partially mitigated** — lockfile committed, SBOM generation, minimal dependency footprint |
| Rubber-hose cryptanalysis | Coercion to reveal master password | **Out of scope** — future: duress password feature |

### Security Assumptions

1. The user's browser is not compromised by malware.
2. The `crypto.getRandomValues()` CSPRNG is not backdoored.
3. The Web Crypto API implementation is correct (browser vendor responsibility).
4. The user chooses a strong master password (>= 12 characters, not found in breach databases).
5. The user keeps their operating system and browser updated.

---

## 3. What Is Protected

| Asset | Protection Mechanism |
|-------|---------------------|
| Vault contents (all items) | AES-256-GCM encryption; only decryptable with derived key |
| Vault integrity | HMAC-SHA256 tag over ciphertext; any modification is detected before decryption |
| Master password | Never stored, logged, or transmitted; held only for duration of Argon2id call, then zeroed |
| Derived encryption key | Non-extractable `CryptoKey` object in Web Crypto API; cannot be exported |
| Plaintext in memory | Auto-lock clears all references; clipboard auto-clears after configurable delay |
| Breach queries | HIBP k-anonymity model — only first 5 hex chars of SHA-1 hash sent to server |

---

## 4. What Is Not Protected

| Scenario | Reason |
|----------|--------|
| Keyloggers capturing your master password | OS-level; no JavaScript API can detect or prevent this |
| Screen capture malware recording your screen | OS-level; cannot prevent framebuffer capture |
| Physical access to an unlocked device | Auto-lock helps but cannot prevent in-person viewing |
| Weak master passwords | A short/common password can be brute-forced despite Argon2id; use the built-in strength meter |
| Browser extensions with full DOM access | While unlocked, a malicious extension could read displayed data |
| Coercion / legal compulsion | Khurklockd has no backdoor, but you can be compelled to unlock it |

---

## 5. Encryption Details

### 5.1 Key Derivation — Argon2id (RFC 9106)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Algorithm | Argon2id | Resistant to both GPU and side-channel attacks |
| Salt | 32 random bytes | Prevents precomputation attacks; stored in `keySalt` |
| Iterations (t) | 3 (configurable 1–10) | Time cost; higher = slower brute-force |
| Memory (m) | 64 MiB (configurable 8–256 MiB) | Memory cost; higher = more GPU resistance |
| Parallelism (p) | 4 (configurable 1–8) | Matches available CPU threads |
| Output | 32 bytes (256 bits) | Matches AES-256 key size |

### 5.2 Encryption — AES-256-GCM (NIST SP 800-38D)

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Algorithm | AES-256-GCM | Authenticated encryption with associated data |
| Key size | 256 bits | Maximum AES key size |
| Nonce (IV) | 12 bytes, fresh per operation | Prevents nonce reuse; generated via `crypto.getRandomValues()` |
| Authentication tag | 128 bits (16 bytes) | Appended to ciphertext by GCM; verified on decryption |

### 5.3 Integrity — HMAC-SHA256 (RFC 2104)

- Computed over the Base64-encoded ciphertext (`encryptedPayload` field).
- Stored as 64 hex characters in the `integrityTag` field.
- Verified **before** decryption — fail-fast design prevents processing tampered data.
- Comparison uses constant-time comparison (`crypto.subtle.timingSafeEqual` where available).

---

## 6. Key Management

### Key Lifecycle

```
┌──────────────────┐
│  Master Password  │  ──►  Held only for Argon2id call, then zeroed
└────────┬─────────┘
         │  Argon2id(password, salt, params)
         v
┌──────────────────┐
│  Derived Key      │  ──►  Non-extractable CryptoKey, never serialized
│  (256-bit AES)    │       Revoked on lock. Never sent over network.
└────────┬─────────┘
         │  Used for:
         ├── encryptVault()  — writes (fresh nonce each time)
         ├── decryptVault()  — reads (passes GCM auth check)
         ├── computeHmac()   — integrity writes
         └── verifyHmac()    — integrity reads
```

### What Never Happens

- The master password is never stored, cached, logged, or persisted.
- The derived key is never exported (`extractable: false`).
- The derived key is never sent over the network.
- Plaintext is never written to `localStorage`, `sessionStorage`, or IndexedDB.
- Console logging of vault data is blocked by ESLint rules and build-time checks.
- Nonces are never reused — a fresh 12-byte nonce is generated for every encryption operation.

---

## 7. Memory Security

### Vault Lock Procedure

When the vault locks (manually or via auto-lock timer):

1. Every property of the `VaultPayload` object is set to `null`.
2. Every item in the `items` array is deep-nullified.
3. The `activeVault` reference is set to `null`.
4. The `primaryKey` `CryptoKey` is revoked (if the implementation supports revocation).
5. Any intermediate copies or cached values are nullified.
6. All blob URLs are revoked via `URL.revokeObjectURL()`.
7. The clipboard is overwritten with an empty string (after `clipboardClearDelay` seconds).

### Auto-Lock Timer

- Default: 5 minutes of inactivity.
- Configurable in Vault Settings (1–60 minutes, or `0` for never).
- Resets on: `mousedown`, `keydown`, `touchstart`, `scroll`, `focus`.
- Accelerates by 50% when the browser tab loses focus for > 30 seconds.
- Manual lock: `Ctrl+Shift+L` / `Cmd+Shift+L` keyboard shortcut.

---

## 8. Losing Your Master Password

**Your data is unrecoverable if you lose your master password.**

There is no:
- Password reset flow
- Recovery key stored on a server
- Backdoor or master key
- "Forgot password" email
- Account recovery process

This is intentional. If a recovery mechanism existed, it would be a vector for attackers to bypass your encryption. The zero-knowledge architecture means **no one** — not even Khurklockd's developers — can recover your vault without the master password.

### Recommendations

- Use a **strong, memorable master password** (12+ characters, mix of words and symbols).
- Consider writing it down and storing it in a secure physical location (safe, safety deposit box).
- Set up **emergency access** (Dead Man's Switch) so trusted contacts can gain access after a waiting period.
- Keep a backup of your `.khurklockd` file in a separate location.

---

## 9. Responsible Disclosure

We take the security of Khurklockd seriously. If you discover a security vulnerability, we appreciate your help in disclosing it responsibly.

### What Constitutes a Security Vulnerability

- Cryptographic weaknesses in encryption, key derivation, or integrity verification
- Plaintext leakage (to console, storage, network, or DOM)
- Nonce reuse or predictable nonce generation
- Bypass of the auto-lock or clipboard-clear mechanisms
- Cross-site scripting (XSS) that could access vault data
- Supply chain attacks in the dependency tree

### What Is Not a Vulnerability

- Missing HTTP security headers on the static site (e.g., CSP on a purely client-side app)
- Clickjacking on a page with no sensitive operations
- Missing rate limiting (there is no server to rate-limit)
- Issues in dependencies that have been publicly disclosed for > 90 days
- Vulnerabilities requiring physical access to an unlocked device

---

## 10. Security Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| — | — | — | — | No security audit has been performed yet. |

A third-party security audit of the cryptographic implementation and key-handling code is planned after Phase 3 (Emergency Access & Browser Extension). We intend to engage a recognized cryptography or application security firm.

### Self-Audit Practices

In lieu of a formal third-party audit, the following practices are enforced:

- **TypeScript strict mode.** All code is written with `strict: true` to catch type-level errors.
- **ESLint security rules.** `no-console`, `no-eval`, and custom rules prevent accidental plaintext logging.
- **Code review.** All cryptographic code paths are documented in [ARCHITECTURE.md](docs/ARCHITECTURE.md) with explicit security rationales.
- **Minimal dependencies in the crypto path.** AES-GCM and HMAC use the browser-native Web Crypto API. Only Argon2id (via `hash-wasm`) is an external dependency.
- **Lockfile committed.** `package-lock.json` with exact versions prevents dependency confusion attacks.

---

## 11. Vulnerability Reporting

### How to Report

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, send a detailed report to the project maintainers. Your report should include:

- A clear description of the vulnerability
- Steps to reproduce (including browser version and OS)
- The affected component or code path
- Potential impact
- Any suggested fixes (if available)

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | Within 72 hours |
| Initial assessment | Within 5 business days |
| Fix developed | Within 30 days (critical: within 7 days) |
| Public disclosure | After fix is deployed and users have had reasonable time to update |

### Recognition

We believe in recognizing security researchers. With your permission, we will include your name in our acknowledgments (unless you request anonymity).

---

**Khurklockd is built on the principle that you should not have to trust anyone with your secrets — including us.** If you find a flaw in that promise, we want to know about it.
