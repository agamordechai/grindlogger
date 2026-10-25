# Home Hosting Runbook (Laptop + Cloudflare Tunnel)

> **Status (2026-10-21):** code and compose config are written and tested; the stack has **not been started yet** on the hosting laptop. Steps 1-6 below are the remaining manual work. Design and decisions: [docs/plans/web-plus-app-hosting.md](../plans/web-plus-app-hosting.md).

## What this serves

`grindlogger.com` hosts two things from one backend:

- **The website** — multi-user, sign in with Google / GitHub / Discord / Reddit or email + password. Data lives in Postgres through the FastAPI backend. Built with `VITE_TARGET=web` (the Docker image does this).
- **Sync for the iOS app** — the app stays local-first and offline. In Settings → *Data Sync* the user signs in (or creates an account) and the app fetches the account's data, then keeps both sides in sync.

Background: the app used to run client-server on AWS EC2. EC2 was shut down and commit `34f72a6` made the frontend an on-device Capacitor app. That on-device code is now one of two build targets of the same React code (see "Two build targets" in the plan doc).

## What the server runs

| Service       | Needed? | Why |
|---------------|---------|-----|
| `db`          | yes     | Postgres |
| `redis`       | yes     | API rate limiting, AI coach cache |
| `api`         | yes     | Auth, sync, website API |
| `ai-coach`    | yes     | The website's AI coach (the browser can't hold an Anthropic key). The iOS app still uses its on-device coach |
| `worker`      | yes     | Warms the AI coach caches |
| `frontend`    | yes     | Serves the **web** build; its nginx proxies `/api/` → `api:8000` and `/ai-coach/` → `ai-coach:8001` |
| `cloudflared` | yes     | Tunnel to Cloudflare (replaces `nginx-proxy` + certs) |
| `nginx-proxy` | no      | AWS-era TLS proxy (`profiles: ["aws"]`) |

All of this is `docker-compose.home.yml` layered on the base + prod files. Only the frontend is exposed locally (`127.0.0.1:3000`); nothing is port-forwarded.

## Setup steps

### 1. Laptop
- Docker Desktop (WSL2 backend). Settings → *Start Docker Desktop when you sign in*.
- Windows power settings: lid close → *Do nothing*; sleep → *Never* when plugged in.
- Docker Desktop only runs after a Windows sign-in, so after a reboot or power cut someone must log in.

### 2. Cloudflare
1. DNS: delete the old `A` records for `grindlogger.com` / `www` pointing at the EC2 IP.
2. Zero Trust → Networks → Tunnels → **Create tunnel** (Cloudflared) → install method **Docker** → copy the token after `--token`.
3. Public hostname: `grindlogger.com` → `HTTP` → `frontend:80` (optionally `www` too).

### 3. `.env`
Docker Compose reads `.env` from the project root. Create it from the template. Open **PowerShell** (not cmd.exe, which has no `cp`) in the project folder:
```powershell
cd C:\Users\Agam\PycharmProjects\grindlogger
Copy-Item deploy\.env.production .env
```
In cmd.exe the equivalent is `copy deploy\.env.production .env`; in Git Bash / WSL it's `cp deploy/.env.production .env`. `.env` is gitignored, so secrets in it are never committed.

Open it with `notepad .env` (or in PyCharm) and fill in the values below. Generate the three secrets in PowerShell and paste each output after the `=`:
```powershell
# JWT_SECRET_KEY (64 hex chars)
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') })

# TOKEN_ENCRYPTION_KEY (Fernet key: url-safe base64 of 32 random bytes)
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b).Replace('+','-').Replace('/','_')

# POSTGRES_PASSWORD (alphanumeric, safe in URLs)
$b = New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { '{0:x2}' -f $_ })
```
`POSTGRES_PASSWORD` must be letters and digits only: it's put into the `DATABASE_URL`, and characters like `@ # / : !` break that URL (the API then fails with `connection to server on socket "@db/..."`). Don't change it after the first `up`: Postgres only sets it when the data volume is created. `PUBLIC_IP` is left over from AWS and isn't needed.

| Variable | Notes |
|----------|-------|
| `JWT_SECRET_KEY` | generated above |
| `POSTGRES_PASSWORD` | generated above |
| `TOKEN_ENCRYPTION_KEY` | generated above |
| `CLOUDFLARE_TUNNEL_TOKEN` | from step 2 |
| `DOMAIN_NAME` | `grindlogger.com` |
| `PUBLIC_URL` | `https://grindlogger.com` — used in emailed links |
| `ANTHROPIC_API_KEY` | for the website's AI coach |
| `ADMIN_EMAILS` | comma-separated; those accounts become admins on login |
| `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Gmail address + a Gmail **app password** (see below) |
| `GOOGLE_*`, `GH_*`, `DISCORD_*`, `REDDIT_*` | OAuth app credentials (step 4); leave empty to hide a provider |

**Gmail SMTP.** Use the same account and app password you already have working in your other project: Google Account → Security → 2-Step Verification → App passwords. `SMTP_USER` is the Gmail address, `SMTP_PASSWORD` the 16-character app password (not the account password). Gmail caps consumer accounts at about 500 recipients/day and mail comes *from* that Gmail address, so it may land in spam for some recipients. If `SMTP_USER` / `SMTP_PASSWORD` are empty the API only logs the email (verification links are then in `docker compose logs api`).

### 4. OAuth apps (website sign-in)
Email + password works without any of these. Create each app you want and put its credentials in `.env`:

| Provider | Console | Settings |
|----------|---------|----------|
| Google | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web) | Authorized JavaScript origin: `https://grindlogger.com`. Put the client ID in `GOOGLE_CLIENT_ID` (and secret in `GOOGLE_CLIENT_SECRET` for calendar sync) |
| GitHub | Settings → Developer settings → OAuth Apps | Callback URL: `https://grindlogger.com/auth/github/callback` → `GH_CLIENT_ID`, `GH_CLIENT_SECRET` |
| Discord | Developer Portal → Applications → OAuth2 | Redirect: `https://grindlogger.com/auth/discord/callback` → `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| Reddit | reddit.com/prefs/apps (type: web app) | Redirect URI: `https://grindlogger.com/auth/reddit/callback` → `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |

The client IDs are baked into the website bundle at build time, so re-run `up -d --build` after changing them.

### 5. Run
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.home.yml config   # sanity check
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.home.yml up -d --build
```
Docker Desktop must be running first (`docker version` should show a Server section). If it says *Docker Desktop is unable to start*, run `wsl --update` in PowerShell and restart Docker Desktop.

`--build` builds the images locally (no GHCR dependency). The first build takes 10+ minutes. On start the API container runs the Alembic migrations; on an empty database it instead creates the schema from the models and stamps it at the latest migration. Check:
- `docker compose ... ps` — everything healthy.
- `https://grindlogger.com/api/health` returns OK.
- Register on the website, confirm the verification email arrives, sign in again, try *Forgot password*.

### 6. Connect the phone
App → Settings → **Data Sync** → keep the server URL `https://grindlogger.com/api`, then **Sign in** or **Create account**.
- Server empty and phone has data → everything uploads. Phone empty → everything downloads.
- Both have data → a *Merge* screen shows counts (phone / server / both). Merge keeps everything; items on both sides keep the server's version. A copy of the phone's data is saved first and can be restored from the same screen ("Restore this phone's data from before connecting", which also disconnects).
- *Disconnect* keeps the phone's data and forgets all links to the server; connecting again re-matches instead of duplicating.

## Backups
The database lives on this laptop. Dump it to another drive or a synced cloud folder:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1 -Destination D:\grindlogger-backups
```
Schedule it daily: Task Scheduler → Create Basic Task → daily → Start a program: `powershell.exe`, arguments `-ExecutionPolicy Bypass -File C:\Users\Agam\PycharmProjects\grindlogger\scripts\backup-db.ps1 -Destination D:\grindlogger-backups`. Dumps older than 30 days are pruned. Restore with:
```powershell
docker exec -i grindlogger-db psql -U workout -d workout_tracker < grindlogger-YYYYMMDD-HHMMSS.sql   # after unzipping
```
Try one restore into a scratch database before relying on it.

## Open items
- [ ] Run steps 1-6 on the hosting laptop; tick the checklist in step 5.
- [ ] Register the OAuth apps you want (email login works without them).
- [ ] Decide whether unverified email/password users should be blocked from signing in. Today they can sign in and see a "verify your email" banner.
- [ ] AI coach image attachments only work in the iOS app (the server coach doesn't accept images yet); the website hides the button.
- [ ] Old EC2 Postgres data is gone unless a backup exists — the app's local data / `db/import.ts` restore is the source of truth for history.
- [ ] `cloudflare/cloudflared` image is pinned to 2025.1.0 in `docker-compose.home.yml` — bump if desired.
- [ ] `.github/workflows/deploy.yml` is now manual-only (it still targets the retired EC2 host).
