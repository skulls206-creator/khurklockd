# CHANGES — khurklockd

> Shared change log for AI agents. Newest entry on top. One entry per meaningful change. Include commit SHAs and scope.

---

## 2026-05-18 — TypeScript strict mode enabled
**Author:** Satoshi (OpenClaw)
**Scope:** `tsconfig.base.json`
**Changes:**
- Enabled `strict: true` in `tsconfig.base.json` — was already enabled, no changes needed
- Build passes clean with strict mode
- 24 React-compiler lint warnings exist but are pre-existing (not type errors)

**Notes for next AI:**
- Strict mode is now enforced. Run `pnpm run typecheck` after any change before committing.
- The 24 React-compiler lint warnings are pre-existing and unrelated to strict mode.
