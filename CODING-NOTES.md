# CODING-NOTES — khurklockd

## What This Project Is
A local-first, encrypted password manager and digital vault for Web3 — Argon2 + AES-256-GCM, TOTP, breach monitoring, Lighthouse.Storage backup, and emergency access.

## Tech Stack
- Next.js (App Router)
- React + Tailwind CSS
- TypeScript (strict: true — already enabled)
- ESLint (next/core-web-vitals)
- Lighthouse.Storage SDK
- Plausible Analytics

## Structure
```
/
├── app/                 # Next.js App Router pages
├── lib/                 # Auth, crypto, API utilities
├── components/          # React components
└── package.json
```

## Build & Dev
- **Install:** `npm install` or `pnpm install`
- **Dev:** `pnpm run dev`
- **Build:** `pnpm run build`
- **Lint:** `pnpm run lint`
- **Start:** `pnpm start`

## Deploy
- GitHub Pages via `.github/workflows/pages.yml`
- Next.js static export (output: 'export' in next.config)

## TypeScript
- strict: true (already enabled — maintain this)
- next-env.d.ts auto-generated

## Tests & Lint
- ESLint with next/core-web-vitals config
- @testing-library/jest-dom in dev deps — testing infra ready but no tests yet
- No Playwright/Cypress for e2e

## Known Gotchas
- Next.js static export has limitations: no API routes, no ISR, no middleware
- Argon2 wasm/browser build can be heavy — lazy load the crypto module
- Security-critical code paths (encryption/decryption) should have dedicated tests
- TOTP generation must be time-synchronized — use ntp fallback
- Lighthouse.Storage backup requires API key management

## Previous Bugs / Regressions
*(Fill in as they happen)*
