# khurklockd CHANGELOG

Append-only log of merged tasks that touched `artifacts/khurklockd/`. Read the newest 5 entries before starting any non-trivial edit. Append a new entry as the last step before marking a task complete, in the same commit as the work.

This file is shared between AI builders working on khurklockd. It is synced bidirectionally with the upstream GitHub repo (`github.com/skulls206-creator/khurklockd`) via `scripts/pull-khurklockd.sh` / `scripts/push-khurklockd.sh` at the monorepo root.

The earlier LockVault product (tasks #1–#19) is retired; its history lives in the monorepo-root `/CHANGELOG.md` for context only.

## Entry schema

```
## Task #N — YYYY-MM-DD — short title
**Intent:** one sentence — why this task existed.
**Outcome:** what actually shipped.
**Key changes:** the substantive code/config touches, not every file.
**Decisions / drift:** notable choices made mid-task, especially ones that deviate from the original plan.
**Don't redo:** load-bearing decisions a fresh agent might "fix" out of ignorance. THIS IS THE CRITICAL FIELD.
**Follow-ups:** known deferred work or open issues.
**Refs:** commit sha, plan file, related tasks.
```

The "Don't redo" field is the whole point of this file. If a future agent reverts something here, they are introducing a regression a prior reviewer or the user explicitly signed off on.

---

## Task #23 — 2026-05-14 — khurklockd UI remix (Quiet direction)
**Intent:** make UI feel less "junior dev"; pick a variant from canvas mockups and apply it via token-level changes.
**Outcome:** Quiet (Linear-inspired) direction landed via a clean 56-line diff across 14 files in `artifacts/khurklockd/`.
**Key changes:**
- `globals.css` palette shift: blue-tinted slate → deeper near-black mono; accent `#3b82f6` → desaturated indigo `#818cf8`; accent-muted alpha lowered.
- `Button.tsx`: dropped `min-h-[44px]` across all sizes; switched to `h-7/h-8/h-10`; primary text → `text-text-inverse` for AA contrast on light indigo; danger hover tokenized (`bg-danger/90`).
- `Badge.tsx` flattened (transparent bg, border-only); `Card.tsx` lost `shadow-sm` and went `rounded-lg`.
- Removed every `min-h-[44px]` / `min-w-[44px]` across `Sidebar`, `ItemList`, `ItemDetail`, `ItemCard`, `PasswordField`, `VaultLockStatus`, `PWARegister`.
- Hardcoded `bg-accent text-white` sites swept (5 files) → `text-text-inverse` for contrast safety.
- Three mockup variants live in `artifacts/mockup-sandbox/src/components/mockups/khurklockd-remix/`: `Quiet.tsx`, `Command.tsx`, `Tripane.tsx`. Quiet was applied; Command and Tripane remain as alternates.
**Decisions / drift:** User said "finish it" without picking a variant; agent committed to Quiet because it most directly addresses the stated junior-dev problems. An early `sed s/  +/ /g` collapsed indentation in 6 files (caught by reviewer #1); reverted those files via `git show 960aacd:<file>` and re-applied only targeted class removals.
**Don't redo:**
- The `min-h-[44px]` strip is **intentional** per explicit user pref. Code reviewers flagged it as a "mobile UX regression"; user disagrees. Do not re-add it.
- Accent color must not be orange (`#FF3C00` and similar) — explicit user ban. Indigo `#818cf8` is the chosen accent.
- No `as any`, no emojis, no AI-slop comments (`// --- Subcomponents ---`-type separators ok if structurally meaningful), no silent fallbacks.
- Reviewer demanded full type/spacing/elevation/motion token system + dialog/select/switch primitive sweep — out of scope, declined intentionally.
**Follow-ups:** light mode tokens (no light palette exists yet). Apply the Command or Tripane direction later if user wants to revisit.
**Refs:** commit `40819cb`, plan `.local/tasks/task-23.md`.

---

## Task #22 — 2026-05-14 — khurklockd code audit + completion AAR
**Intent:** audit khurklockd (authored by a different, less-rigorous AI builder) before trusting it as a real password manager — feature completeness, crypto correctness, security holes, code quality.
**Outcome:** AAR appended to `docs/khurklockd-integration.md` with feature matrix, security findings, code-quality notes, and an action split (fix locally / upstream / defer). Upstream issue drafts saved under `docs/upstream-issues/`.
**Key changes:** local fixes for findings in the "fix locally" table; no architectural changes.
**Don't redo:** stay confined to `artifacts/khurklockd/` for any follow-up fix. Anything invasive belongs upstream as a draft issue, not a fork patch.
**Follow-ups:** track upstream-issue resolution; re-audit after each significant khurklockd upstream pull.
**Refs:** commit `d88fd28`, plan `.local/tasks/task-22.md`, `docs/khurklockd-integration.md`.

---

## Task #21 — (pre-merge of #22) — replace LockVault with khurklockd
**Intent:** swap the in-house LockVault build for the externally-authored khurklockd as the user's actual password-manager artifact.
**Outcome:** `artifacts/khurklockd/` registered as the primary web artifact; LockVault (`artifacts/password-manager/`) was retained briefly but is no longer the active product. Integration doc `docs/khurklockd-integration.md` established as the cross-builder coordination surface.
**Don't redo:** task #1–#19 LockVault entries describe the *retired* codebase. Don't try to "restore" LockVault features into khurklockd by porting code one-to-one — re-evaluate per-feature.
**Refs:** commits `29f0d8e`, `3bedc93`, `837a85d`.

---

## Task #20 — 2026-05-14 — mobile UX + PWA polish for khurklockd
**Intent:** make khurklockd usable on phones (safe-area insets, touch targets, viewport-fit, PWA install ergonomics).
**Outcome:** PWA install path tightened, mobile-specific layout polish across vault screens. Multiple commits (`dcde40a`, `83599fa`, `5166657`, `f395c69`).
**Don't redo:**
- Safe-area envs (`env(safe-area-inset-*)`) on fixed-position elements are intentional — do not strip them.
- The original `min-h-[44px]`/`min-w-[44px]` for touch targets was added here; Task #23 removed them at the user's explicit request. Don't reconcile by re-adding — user prefers the visual density at the cost of strict touch-target conformance.
**Refs:** plan `.local/tasks/task-20.md`, commits listed above.

---

## Task #24 — 2026-05-14 — 8-item cleanup sprint (dead code, CSS, Argon2id, tests, light mode, type safety)
**Intent:** Address the 8 highest-priority findings from the khurklockd code audit: dead code removal, broken CSS, type/schema drift, unsafe casts, HIBP rate limiting, PBKDF2→Argon2id swap, zero test coverage, and missing light mode.
**Outcome:** All 8 items shipped. Codebase is 28 tests richer, crypto uses real Argon2id via hash-wasm, 12 `as unknown as VaultItem` casts replaced with Zod-validated partials, dead route file deleted, type drift reconciled, CSS tokens fixed, light palette added.
**Key changes:**
- `src/app/(vault)/import/page.tsx` — deleted (dead route, layout rendered component version)
- `src/components/vault/ItemEditor.tsx:48` — removed `const defaults = (initial as unknown) ? undefined : undefined` dead code
- `src/components/vault/ItemList.tsx` — `bg-surface-elevated` → `bg-bg-elevated` (3 occurrences, missing token)
- `src/lib/breach/breach.ts` — `RATE_LIMIT_DELAY_MS` 250 → 1500 (HIBP spec compliance)
- `src/types/index.ts` — added `lastBackupCid` and `lastBackupAt` to `VaultSettings` to match Zod schema
- `src/lib/crypto/argon2.ts` — full rewrite from PBKDF2-SHA256 to `hash-wasm` Argon2id. Uses 3 iterations (not 600K), keeps same API. Default configs updated in `vault-manager.ts` and `schema.ts`
- `src/lib/import/mapper.ts` — replaced 5 `as unknown as VaultItem` casts with Zod `partial().parse()` helpers
- `src/app/(vault)/layout.tsx` — replaced 6 `as unknown` casts (empty item construction + type-specific field fills) with `createEmptyItem()` using Zod partial schemas
- `src/lib/crypto/utils.test.ts` — 17 tests for encoding, hex/base64, constant-time comparison, RNG
- `src/lib/crypto/encryption.test.ts` — 3 tests for AES-256-GCM encrypt/decrypt + wrong-key rejection
- `src/lib/crypto/integrity.test.ts` — 4 tests for HMAC compute/verify/tamper-detection + wipeKey
- `src/lib/crypto/argon2.test.ts` — 4 tests for Argon2id key derivation (WASM-based, crypto correctness)
- `src/app/globals.css` — added `@media (prefers-color-scheme: light)` block + `.light` class overrides with full light palette
**Decisions / drift:** Argon2id default iterations set to 3 per RFC 9106 OWASP recommendation. Build command changed to `npm run build` (was `next build` — just a script shortcut, no behavior change). No `--max-warnings` was lowered; 12 pre-existing React 19 lint errors remain (setState-in-effect, ref-during-render patterns untouched per surgical-change rule).
**Don't redo:**
- `bg-surface-elevated` does not exist in the token set; `bg-bg-elevated` is the correct class. Do not add a new `--color-surface-elevated` token — use existing `--color-bg-elevated`.
- The `createEmptyItem` function in layout.tsx uses Zod partial schemas with `as VaultItem` at the return site. This is intentional — TypeScript can't narrow a union from a dynamic `type` variable. The Zod parse provides runtime validation (catches structural drift); the `as VaultItem` is only a type-level assertion, not a safety bypass.
- Argon2id WASM must be available at runtime. No PBKDF2 fallback was kept. If WASM fails, key derivation throws — which is the correct failure mode (no silent degradation to weaker KDF).
**Follow-ups:** Wire up the `.light` class via theme context (currently only respects `prefers-color-scheme` media query). Add i18n locale support matching the `locale` setting field. Add import/export keyboard shortcuts.
**Refs:** commit `<pending>`, no plan file (task was self-contained, no `.local/tasks/`).

---

## Reading order for fresh agents

1. This file — newest 5 entries.
2. `AGENTS.md` in this folder (per-artifact agent rules).
3. The plan file in `.local/tasks/` for the task you're working on (if any).
4. `docs/khurklockd-integration.md` — adapter boundary between this repo and the Replit monorepo.

If you're about to change something a "Don't redo" line covers, stop and confirm with the user first.

## Sync discipline

When working from the Replit monorepo: append your entry, commit, then run `scripts/push-khurklockd.sh` **before** anyone else might run `scripts/pull-khurklockd.sh`. The pull script overwrites local non-adapter source. Push your entry first; pull theirs second.
