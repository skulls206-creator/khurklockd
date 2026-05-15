<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:changelog-obligation -->
# Cross-builder coordination via `./CHANGELOG.md`

This project is touched by more than one AI builder. To stay in sync, both builders are obligated to use **`./CHANGELOG.md` in this folder** as the single coordination surface. That file is synced bidirectionally with the upstream GitHub repo, so entries written here are visible to the other builder and vice versa.

## Before you start a non-trivial edit
1. Read the newest 5 entries in `./CHANGELOG.md`.
2. If your planned change overlaps with anything in a **"Don't redo"** field, stop and confirm with the user before proceeding. Those lines capture intentional decisions a prior reviewer or the user explicitly signed off on — reverting one is a regression, not a fix.

## Before you mark a task complete
Append a new entry to `./CHANGELOG.md` in the same commit as the work, using the schema documented at the top of that file. The six fields:
- **Intent** — one sentence on why the task existed.
- **Outcome** — what actually shipped.
- **Key changes** — substantive touches, not every file.
- **Decisions / drift** — notable mid-task choices, deviations from plan.
- **Don't redo** — load-bearing decisions a fresh agent might "fix" out of ignorance. **This is the critical field.** Be specific. If the user explicitly chose X over Y, say so.
- **Follow-ups** — known deferred work.
- **Refs** — commit sha, plan file in `.local/tasks/`, related task numbers.

Entries are append-only. Do not rewrite or "tidy up" prior entries — they are the audit trail.

## Sync with upstream
If you are working inside the Replit monorepo, push your CHANGELOG entry to the upstream GitHub repo right after appending it (run `scripts/push-khurklockd.sh` from the monorepo root). The push must happen **before** anyone might run `scripts/pull-khurklockd.sh`, since pull overwrites local non-adapter source. Order: append → commit → push → (later) pull.

If you are working directly on GitHub, just commit and push as normal — the Replit side will pick it up on next pull.

## Reading order for any fresh session
1. `./CHANGELOG.md` in this folder (newest 5 entries)
2. This file (per-artifact agent rules)
3. The `.local/tasks/task-NN.md` plan file for the task you're working on (Replit-side only)
4. `docs/khurklockd-integration.md` — adapter boundary between this folder and the Replit monorepo
<!-- END:changelog-obligation -->
