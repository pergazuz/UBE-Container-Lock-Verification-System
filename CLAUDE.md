# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend-only **POC** of a container lock verification terminal: the operator scans a container's QR code (mandatory — the container ID is the primary key), four cameras (one per side A–D) feed a Verify step that classifies each side's latch as Locked / Unlocked / Not Visible, and the system derives an overall Pass / Fail / Uncertain verdict. Scanning an ID whose latest result was not Pass marks the new attempt as a **rework**. All verification results are **mocked** — there is no backend or AI model yet, but the code is structured so one can be wired in later without UI changes.

## Commands

Bun is the runtime/package manager (there is a `bun.lock`).

```bash
bun install
bun run dev        # Vite dev server at http://localhost:5173
bun run build      # tsc -b + vite build
bun run preview    # serve the built dist/
bun run typecheck  # tsc -b --noEmit
```

There is no test framework and no linter configured — `bun run typecheck` (or `build`) is the verification step.

## Architecture

Stack: React 19 + Vite 6 + TypeScript, Tailwind CSS v4, shadcn/ui (new-york) + Radix, react-router-dom v7. Path alias `@` → `src/` (vite.config.ts + tsconfig).

### The single swap point

All verification logic lives in one function:

- `src/lib/verifyContainer.ts` → `verifyContainer(input: VerifyInput): Promise<VerificationResult>`

It currently returns a weighted-random mock after a simulated 1.4–2.4s delay (rework attempts skew toward Locked, since the operator just fixed the latches). When connecting a real backend/vision model, **replace only the body of this function** — the entire UI depends only on the `VerificationResult` type from `src/types.ts`. Preserve this boundary: do not spread verification logic into components.

Verdict rules embedded there (per spec — minimize false "Locked"):
- Any side NotVisible → **Fail**
- Any side Unlocked → **Fail**
- All four Locked but overall confidence < threshold → **Uncertain** (ask for recheck rather than risk a false Pass)
- Overall confidence = `min` across the four sides

Sides are always iterated via `SIDE_KEYS` (`["A","B","C","D"]` in `src/types.ts`); results/images are keyed records (`result.sides[k]`, `log.images?.[k]`), so a change in camera count is a change to that one constant plus the mock.

### Data layer: contexts, all localStorage-backed

Provider nesting in `App.tsx` is ordered by dependency: `SettingsProvider` → `LogStoreProvider` → `AuthProvider` (writes login/user events via the store's `logEvent`) → `SessionProvider`. Routing: `/login` is public; everything else sits under the `RequireAuth` layout route (app shell + redirect), with `/users` further wrapped in `RequireSupervisor`.

- `src/data/store.tsx` — verification logs (`ube.logs.v2`) **and** the event log (`ube.events.v1`, capped at 3000). `addLog` auto-appends the matching `verify_*` event; `applyOverride` appends an `override` event; `latestForContainer()` drives rework detection. Seeding writes both keys together (`ensureSeeded` → `src/data/seed.ts`, which also builds rework chains and login events).
- `src/data/auth.tsx` — user accounts (`ube.users.v1`, seeded async from `EMPLOYEES` with SHA-256 password hashes) + signed-in session (`ube.auth.v1`). Guards: can't deactivate yourself, must always keep ≥1 active supervisor. Also exports non-reactive `userName(id)` for tables/CSV. POC-grade hashing — a real backend replaces internals, not the hook surface.
- `src/data/session.tsx` — station picker only (`ube.station.v1`); *who* is operating comes from auth.
- `src/data/settings.tsx` — threshold, container type, station open/close (`ube.settings.v1`). Verification criteria and station availability are supervisor-only in the UI; closed stations are unselectable in the header picker and block verification.

`src/types.ts` is the shared domain contract (verification, users, events). An override never mutates the model result — it's stored alongside it and resolved via `effectiveVerdict(log)`; overrides are retraining data. The event log mirrors pipe_counting: `AUDIT_KINDS` (login, override, settings, user management) are supervisor-only in `/logs`; operators see only verify events.

### Verify flow

`VerifyStation`: QR scan is the mandatory first step — the ScanBar input works with USB keyboard-wedge scanners (code + Enter) and has POC simulate buttons; Verify stays disabled until an ID is scanned. Scanning computes the attempt type: latest log for that ID not Pass → `rework`. On Verify it captures one frame per side camera (downscaled to ≤640px JPEG — four data URLs per log go into localStorage), pauses the feeds, calls `verifyContainer()`, and persists frames + result under the scanned container ID. Override is supervisor-only: the override buttons (verify result panel + history detail dialog) are hidden from operators, and the signed-in supervisor signs the override with their session account — no password re-entry (`verifyPassword` remains in the auth surface for a real backend).

## Conventions

- **UI language is Thai-primary** with English technical terms kept as-is: Verify, Pass/Fail, Locked/Unlocked, Not Visible, Override, Rework, confidence. `src/lib/format.ts` holds the Thai formatting/label helpers; follow its bilingual label pattern (e.g. "Locked · ล็อกแล้ว").
- **Theme**: dark industrial "INSTRUMENT" HMI. Tailwind v4 is configured entirely in `src/index.css` (`@theme inline`) — there is no tailwind.config. Semantic signal tokens are `--pass` (green), `--fail` (red), `--uncertain` (amber — also used for rework), `--info`, `--hazard`, exposed as utilities like `text-pass`/`bg-fail`. Use these tokens for verdict/status coloring, not raw palette classes.
- Verdict/lock-status icon + color mappings are centralized in `src/components/verdict-visual.ts` (`VERDICT_VISUAL`, `LOCK_VISUAL`) — extend there rather than hardcoding per component.
- Technical readouts (IDs, container IDs, timestamps, confidence values) use `font-mono` (IBM Plex Mono); body copy uses IBM Plex Sans Thai.
- Exports are real Excel workbooks (`src/lib/excel.ts` — logs and events, built with SheetJS `xlsx`) so Thai text and columns open correctly regardless of Excel locale.
