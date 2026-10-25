# Web + App Hosting: Decisions and Scope

> **Status (2026-10-21):** phases 1-5 are **implemented and tested locally** (backend pytest, frontend vitest, both web and native bundles build). The one remaining step is Phase 0: start the stack on the hosting laptop and do the manual setup (Cloudflare tunnel, `.env`, OAuth apps). See "Implementation notes" at the end for what was built and where it settled differently from the text above.
> Related: [home hosting runbook](../runbooks/home-hosting.md) (infrastructure setup, Phase 0 below).

## Goal

Serve both products from the laptop-hosted backend at `grindlogger.com`:

- **Website (B):** multi-user. People sign up or sign in; data lives in Postgres via the FastAPI backend. Same feature set as before commit `34f72a6`.
- **iOS app (A):** stays local-first and offline (SQLite, on-device AI coach, no login required). Gains an explicit **Connect** flow that signs in and **fetches** server data into the local database.

Both come from one React codebase built in two modes, and one backend serves both.

## Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Hosting method | Cloudflare Tunnel from the laptop (`docker-compose.home.yml`). No port forwarding. |
| 2 | A, B, or both | **Both.** Same code, two build targets, one backend. |
| 3 | Website users | **Multi-user** with public sign-up. |
| 4 | Web login providers | **Everything we had before:** Google, GitHub, Discord, Reddit, plus email/password. |
| 5 | Sync scope | **Extend sync** so archive, sort order and superset state match between app and web. |
| 6 | First-connect behavior | Merge by default, as specified below. |
| 7 | Email verification and password reset | **In scope**, sent through Gmail SMTP (app password). |
| 8 | Profile sync | Name, cycle length **and units**. |

## Architecture

### Build targets
- `VITE_TARGET=native|web`, default `native` so the iOS build is unchanged.
- Split `services/frontend/src/api/client.ts` into:
  - `api/local.ts`: today's SQLite + on-device AI code.
  - `api/remote.ts`: restored from `34f72a6^` and adjusted for API changes since.
  - `api/index.ts`: picks one at build time, so the unused one (and Capacitor/SQLite code on web) is tree-shaken.
- Split `AuthContext` the same way:
  - `native`: single local user, no login (current behavior).
  - `web`: pre-`34f72a6` version with Google/GitHub/Discord/Reddit/email login, register, and route guards. Restore admin gating if it existed (verify from the old code).
- Reference for the old code: `git show 34f72a6^:services/frontend/src/...`.

### Server
- Services: `db`, `redis`, `api`, `frontend`, `cloudflared`, plus `ai-coach` and `worker` (the `server-ai` profile) for the web AI coach.
- The server needs `ANTHROPIC_API_KEY`. The browser must never hold the key; the native app keeps its own on-device key.
- One API serves both: existing sync endpoints (`/auth/login`, `/auth/refresh`, `/exercises`, `/sessions`, `/measurements`) and the original REST/OAuth endpoints.
- Extra load from the AI services means checking the laptop's RAM/CPU budget.

### OAuth
- Four OAuth apps with `https://grindlogger.com` redirect URIs (Google, GitHub, Discord, Reddit). The owner registers them in each provider console; the implementation plan should list exact redirect URIs and the env vars each one needs.
- Suggested order: build email/password first so the site works before the OAuth apps exist.

## App "Connect and fetch" flow

Settings → Data Sync:

1. **Connect screen:** server URL (default `https://grindlogger.com/api`), **Sign in** and **Create account** buttons. Today there is no register button.
2. After login, **fetch** exercises, sessions and measurements from the server.
3. Show progress and a summary, e.g. "Fetched 42 sessions, 9 exercises".
4. After the first fetch, background sync continues as today (push, then pull and diff, last-write-wins by `updated_at`).
5. **Disconnect** removes tokens and keeps local data.

### First-connect behavior (decided)

| Situation | Behavior |
|-----------|----------|
| Server empty, phone has data | Upload everything. No prompt. |
| Phone empty, server has data | Download everything. No prompt. |
| Both have data | Show a **Merge** screen with counts ("200 on this phone, 30 on the server, about 12 overlap") and one **Merge** button. |
| Destructive options | "Replace local with server" and "Upload local, overwrite server" sit behind an **Advanced** option, each with a confirmation that states what will be deleted. |

- **Backup first:** before any first-connect that changes local data, copy the SQLite file. The app already has a restore-from-backup feature to undo a bad merge.
- **Match rules** for the first merge, because local rows have no `remote_id` yet and a naive merge would create duplicates:
  - Sessions: same date and workout day.
  - Exercises: same name and workout day.
  - Measurements: same date.
  - A match links the two rows (sets `remote_id`); the newer `updated_at` wins. Unmatched rows are copied to the other side.

## Extended sync

Today (`services/frontend/src/sync/engine.ts`) only name, sets, reps, weight, workout_day, notes and per_side sync. Archive, sort order and superset state are local-only. The server already stores `archived`, `sort_order` and `superset_group`.

Work needed:
- Accept those fields in the exercise POST/PATCH payloads on the API (verify what the endpoints take now).
- Send and receive them in the engine, mapping `superset_group` between local and remote IDs.
- Still not synced: conversations and the user profile. Decide in the plan whether the profile (units, cycle length) should join, since web users will have one.

## Phases

0. **Server up** (no code changes): Cloudflare tunnel, `.env`, home compose stack, health check, register a test account, run Data Sync once. See the runbook.
1. **Web build target:** the adapter split, auth restore, login/register pages, server AI profile, OAuth.
2. **App Connect and fetch:** connect screen, register button, first-connect merge, backup, disconnect.
3. **Extended sync and consistency:** the field additions above, plus round-trip tests (create on app → see on web → edit on web → see on app).
4. **Housekeeping and hardening:**
   - `deploy.yml` still SSHes to the dead EC2 host; make it build-only or manual-only.
   - Public multi-user needs: rate limits, email verification, password reset, account deletion.
   - Postgres backups to an external disk or cloud bucket, since the data lives on a laptop.

## Risks and open questions

- **Duplicates on first merge** if match rules miss. Mitigated by the backup and by showing overlap counts before merging.
- **Laptop as production:** sleep/lid settings, a Windows sign-in needed after reboot, no redundancy, residential uptime.
- **Old API drift:** the pre-`34f72a6` client may not match the current API after the sync-layer changes and the coach-images feature. Diff before restoring.
- **Old EC2 Postgres data is gone** unless a backup exists. The local `db/import.ts` restore remains the source of truth for the owner's history.
- **Email verification and password reset:** unknown whether the old backend had them. Check, then decide.
- **Admin gating:** confirm what existed and whether it is still wanted.
- **Profile sync:** decide whether it is in scope (see above).

## Implementation notes

What was built, and where it differs from the text above.

### Backend (`services/api`, `services/shared`)
- `POST /exercises` and `PATCH /exercises/{id}` accept `archived`, `sort_order`, `superset_group`; `GET /exercises?include_archived=true`; `PATCH ...?auto_log=false` (sync pushes must not make the server log a workout session); archive / restore / reorder / superset now bump `updated_at`; leaving a superset through PATCH auto-unlinks a one-member group.
- `GET /sessions/index` (id, date, workout day, `updated_at` for every session) replaces the 24-month calendar crawl, so old sessions are no longer treated as deleted and unchanged sessions need no detail fetch.
- Profile: `users.units` (nullable until chosen, `metric` | `imperial`), `profile_updated_at`; `PATCH /auth/me` accepts `units`; `cycle_length` limit aligned to 1-26.
- Email: `mailer.py` (Gmail SMTP, STARTTLS), `email_tokens.py` (SHA-256-hashed single-use tokens; verify 24 h, reset 1 h), `POST /auth/verify-email | resend-verification | forgot-password | reset-password`. Resetting a password revokes earlier refresh tokens (`iat` vs `password_changed_at`). `forgot-password` answers identically for unknown addresses.
- Alembic `q8r9s0t1u2v3`: new columns and `email_tokens` table; existing users are grandfathered as verified.
- **Security fixes found on the way:** `POST /auth/register` used to attach a password to an existing social-login account (anyone could take over an account by registering its email); it now returns 409. Conversely, an OAuth sign-in that links to an *unverified* email/password account clears that account's password (pre-registration takeover). Login and refresh now reject disabled accounts. `DELETE /auth/me` deletes sessions, sets, measurements and email tokens too (it used to leave them and would violate foreign keys on Postgres).

### Frontend (`services/frontend`)
- Two build targets from one codebase: `VITE_TARGET=web` (`npm run build:web`, `.env.web`) and the default native build. `src/api/client.ts` re-exports `@api-impl`, which Vite resolves to `api/local.ts` (SQLite + on-device AI) or `api/remote.ts` (axios to the backend). `api/contract.ts` plus `tsconfig.web.json` make the compiler check that both expose the same API. CI also asserts the web bundle contains no SQLite / on-device AI code.
- Website: login page, OAuth callbacks, admin page, sign out, verify / forgot / reset pages, a "verify your email" banner, server AI-provider settings. Native: unchanged behavior, plus the sections below.
- Sync engine: archive, order and superset state now sync (supersets created offline are recreated through `POST /exercises/superset` so server-allocated group ids never collide); profile sync with last-write-wins; `is404` now checks a status code (the old regex on the message never matched FastAPI's `detail`, so push-side 404 recovery never ran); an exercise deleted on the server while edited locally is recreated instead of silently orphaned.
- Connect flow (`sync/firstConnect.ts`, `SyncSection.tsx`): sign in or create account; nothing is saved until the user confirms. Scenarios and the Merge / Advanced options behave as specified above.
- Safety: `db/snapshot.ts` keeps the last three pre-connect copies **inside the local database** (no file picker or share sheet needed on iOS) and offers "Restore ... and disconnect". Disconnect now unlinks every row, so reconnecting re-matches by natural key instead of trusting stale ids.
- Tests: `npm test` (vitest, in-memory SQLite via sql.js, fake server): 23 tests covering extended sync, supersets, 404 recovery, first-connect scenarios, replace / overwrite, snapshot restore, disconnect / reconnect.

### Differences from the plan above
- **Matched rows on first connect keep the server's version**, not "the newer one": local rows have no modified timestamps (exercises have none, sessions only `created_at`), so "newer wins" cannot be evaluated. After the first connect, normal last-write-wins applies per row.
- The safety copy is a database snapshot rather than a downloadable file (see above); restoring it also disconnects, because the server already received the merged data.
- The website's AI coach cannot take image attachments (the server coach has no image support yet); the attach button is hidden there.
- Unverified email/password users can sign in (they see a banner); blocking them is an open choice in the runbook.
- Not synced: AI coach conversations, the on-device AI key, Google Calendar event ids.

### Still to do (manual)
Run the runbook on the hosting laptop, register the OAuth apps, schedule `scripts/backup-db.ps1`.
