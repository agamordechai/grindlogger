# GitHub & Discord OAuth Setup Guide

Follow these steps to create OAuth apps for GitHub and Discord, then add the credentials to your environment.

---

## Part 1 — GitHub OAuth App

### Step 1: Create the GitHub OAuth App

1. Go to **github.com → Settings → Developer settings → OAuth Apps**
   (direct link: `https://github.com/settings/developers`)

2. Click **"New OAuth App"**

3. Fill in the fields:
   | Field | Value |
   |---|---|
   | **Application name** | `GrindLogger` (or anything you like) |
   | **Homepage URL** | `https://your-domain.com` (use `http://localhost:5173` for dev-only) |
   | **Authorization callback URL** | `https://your-domain.com/auth/github/callback` |

   > For **local development**, add a **separate** dev OAuth app with callback URL `http://localhost:5173/auth/github/callback`.
   > GitHub only allows one callback URL per app, so you need two apps (one dev, one prod) or use the prod domain for both environments.

4. Click **"Register application"**

5. On the next screen:
   - Copy the **Client ID** — this is your `GITHUB_CLIENT_ID`
   - Click **"Generate a new client secret"**
   - Copy the secret immediately — this is your `GITHUB_CLIENT_SECRET` (you won't see it again)

---

## Part 2 — Discord OAuth App

### Step 2: Create the Discord OAuth App

1. Go to **discord.com/developers/applications**
   (direct link: `https://discord.com/developers/applications`)

2. Click **"New Application"** (top-right)

3. Give it a name (e.g., `GrindLogger`) and click **"Create"**

4. In the left sidebar, click **"OAuth2"**

5. Under **"Redirects"**, click **"Add Redirect"** and add:
   - `https://your-domain.com/auth/discord/callback` (production)
   - `http://localhost:5173/auth/discord/callback` (development — you can add both)

6. Click **"Save Changes"**

7. On the same OAuth2 page:
   - Copy the **Client ID** — this is your `DISCORD_CLIENT_ID`
   - Click **"Reset Secret"** → **"Yes, do it!"**
   - Copy the secret — this is your `DISCORD_CLIENT_SECRET`

---

## Part 3 — Add credentials to your local `.env`

Open your `.env` file in the project root and add:

```env
GH_CLIENT_ID=your-github-client-id-here
GH_CLIENT_SECRET=your-github-client-secret-here
DISCORD_CLIENT_ID=your-discord-client-id-here
DISCORD_CLIENT_SECRET=your-discord-client-secret-here
```

---

## Part 4 — Add credentials to GitHub repository secrets (for production deploy)

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**

2. Click **"New repository secret"** for each of the following:

   | Secret name | Value |
   |---|---|
   | `GH_CLIENT_ID` | Your GitHub OAuth App Client ID |
   | `GH_CLIENT_SECRET` | Your GitHub OAuth App Client Secret |
   | `DISCORD_CLIENT_ID` | Your Discord Application Client ID |
   | `DISCORD_CLIENT_SECRET` | Your Discord Application Client Secret |

   > **Important:** GitHub Actions does not allow secrets starting with `GITHUB_` (that prefix is reserved). That's why GitHub credentials use `GH_` as the prefix here.

---

## Summary of env vars

| Variable | Where it's used | Secret? |
|---|---|---|
| `GH_CLIENT_ID` | Backend (code exchange) + Frontend (OAuth URL) | No (but store as secret for CI) |
| `GH_CLIENT_SECRET` | Backend only (never exposed to browser) | **Yes** |
| `DISCORD_CLIENT_ID` | Backend (code exchange) + Frontend (OAuth URL) | No (but store as secret for CI) |
| `DISCORD_CLIENT_SECRET` | Backend only (never exposed to browser) | **Yes** |
