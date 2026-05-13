# Khurklockd

**Your vault. Your file. Your keys. No server, no trust required.**

A local-first, zero-knowledge password manager that stores your secrets in an encrypted file you own. All cryptography happens in your browser. No plaintext ever leaves your machine.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![AES-256-GCM](https://img.shields.io/badge/Encryption-AES--256--GCM-green)](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
[![Argon2id](https://img.shields.io/badge/KDF-Argon2id-orange)](https://datatracker.ietf.org/doc/rfc9106/)
[![License](https://img.shields.io/badge/license-TBD-lightgrey)](#)

---

## Features

| Category | Capability |
|----------|-----------|
| **Core Vault** | Create, open, edit, and save encrypted `.khurklockd` files |
| **Encryption** | AES-256-GCM with Argon2id key derivation and HMAC-SHA256 integrity |
| **Password Generator** | Configurable passwords (8--128 chars) + EFF diceware passphrases |
| **TOTP / 2FA** | Built-in RFC 6238 TOTP codes — no separate authenticator app needed |
| **Breach Monitoring** | Have I Been Pwned integration via privacy-preserving k-anonymity |
| **Emergency Access** | Dead Man's Switch — trusted contacts get access if you go missing |
| **Digital Wallet** | Store credit cards, identities, and secure notes |
| **Import / Export** | CSV and JSON import from LastPass, 1Password, Bitwarden, Dashlane, KeePass |
| **Auto-Lock** | Configurable inactivity timer with clipboard auto-clear |
| **Dark Mode** | Built-in dark and light themes |
| **PWA** | Install as a desktop/mobile app with offline support |

## Architecture Highlights

```
Your Browser (only)                   .khurklockd File (anywhere you put it)
┌──────────────────────────┐          ┌──────────────────────────────────┐
│  Master Password         │          │  { version, keySalt,             │
│       +                  │          │    encryptedPayload,              │
│  Salt (32 random bytes)  │          │    iv (12 random bytes),          │
│       |                  │          │    integrityTag (HMAC-SHA256) }   │
│  Argon2id (64 MiB)       │          └──────────────────────────────────┘
│       |                  │
│  AES-256-GCM Key         │──────►  Dropbox / Drive / iCloud / USB stick
│       |                  │         (Always encrypted — provider sees
│  Encrypt / Decrypt       │          only ciphertext)
└──────────────────────────┘
```

- **Zero-knowledge.** No server stores your master password or plaintext. Encryption and decryption happen exclusively in your browser.
- **Portable vault.** The `.khurklockd` file is a single JSON file. Sync it with Dropbox, Google Drive, iCloud, or carry it on a USB stick.
- **Minimal dependencies.** AES-GCM and HMAC use the browser-native Web Crypto API. The only external crypto dependency is `hash-wasm` for Argon2id WASM.
- **Fail-fast integrity.** HMAC-SHA256 verification runs before decryption — tampered vaults are rejected without touching the ciphertext.

## Quick Start

### Live Demo

Open the hosted app at **[skulls206-creator.github.io/khurklockd](https://skulls206-creator.github.io/khurklockd/)**.

### Run Locally

```bash
git clone https://github.com/skulls206-creator/khurklockd.git
cd khurklockd
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build   # Static HTML/CSS/JS — no server needed
```

The output in `out/` can be served by any static file host (Vercel, Netlify, GitHub Pages, nginx).

## Vault File Format

Every vault is a single `.khurklockd` file — minified JSON with this structure:

```json
{
  "version": "1.0.0",
  "createdAt": "2026-05-12T23:00:00.000Z",
  "updatedAt": "2026-05-12T23:30:00.000Z",
  "keySalt": "a1b2...e1f2",
  "encryptedPayload": "dGhpcyBpcyBhIGJhc2U2NCBlbmNv...",
  "iv": "a1b2c3d4e5f6a7b8c9d0",
  "integrityTag": "f7e8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}
```

Inside `encryptedPayload` (after decryption): your items (logins, notes, cards, identities, wallets) and vault settings. See the [Architecture Document](docs/ARCHITECTURE.md) for the full format specification.

## Security Model

| Concern | Approach |
|---------|---------|
| **Data at rest** | AES-256-GCM encryption with per-operation fresh nonces |
| **Key derivation** | Argon2id (64 MiB, 3 iterations, 4-way parallelism) — resistant to GPU brute-force |
| **Data in transit** | No data is transmitted. The vault file stays on your device. If you sync via cloud storage, the provider sees only ciphertext |
| **Integrity** | HMAC-SHA256 tag over ciphertext. Tampering is detected before decryption |
| **Memory** | Plaintext held only while unlocked. Auto-lock clears from memory. Master password never stored |
| **Clipboard** | Copied secrets are automatically cleared after a configurable delay |

**What happens if I lose my master password?** Your data is unrecoverable. There is no backdoor, no reset flow, no recovery key stored on a server. This is by design — it means no one else can recover it either.

See [SECURITY.md](SECURITY.md) for the full threat model and disclosure policy.

## Roadmap

| Phase | Milestone | Status |
|-------|-----------|--------|
| **1** | Core vault: encryption, CRUD, generator, basic UI | Done |
| **2** | TOTP engine, breach monitoring, import/export, settings | In progress |
| **3** | Emergency access (Dead Man's Switch), browser extension, item sharing | Planned |
| **4** | PWA, biometric unlock, accessibility (WCAG 2.1 AA), competitor import | Planned |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full technical architecture, crypto specification, threat model |
| [SECURITY.md](SECURITY.md) | Security model, responsible disclosure policy |
| [USER-GUIDE.md](docs/USER-GUIDE.md) | Getting started, feature walkthroughs, FAQ |

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4 with dark-first design system
- **Crypto:** Web Crypto API (AES-256-GCM, HMAC-SHA256) + hash-wasm (Argon2id WASM)
- **Validation:** Zod for runtime schema validation
- **Passwords:** zxcvbn for strength estimation
- **Testing:** Vitest + React Testing Library
- **Build:** Turbopack, static HTML export

## License

License to be determined. Options under consideration: AGPLv3 or Business Source License (BSL).

---

Built with zero-knowledge principles. Your data belongs to you.
