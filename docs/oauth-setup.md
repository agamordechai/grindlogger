# GitHub, Discord & Reddit OAuth Setup Guide

Follow these steps to create OAuth apps, then add the credentials to your environment.

---

## Part 1 — GitHub OAuth App

1. Go to **github.com → Settings → Developer settings → OAuth Apps**
   (direct link: `https://github.com/settings/developers`)

2. Click **"New OAuth App"**

3. Fill in the fields:
   | Field | Value |
   |---|---|
   | **Application name** | `GrindLogger` |
   | **Homepage URL** | `https://your-domain.com` |
   | **Authorization callback URL** | `https://your-domain.com/auth/github/callback` |

   > For **local development**, create a second dev app with callback `http://localhost:5173/auth/github/callback`.
   > GitHub only allows one callback URL per app.

4. Click **"Register application"**

5. Copy the **Client ID** → `GH_CLIENT_ID`
   Click **"Generate a new client secret"** → copy it immediately → `GH_CLIENT_SECRET`

---

## Part 2 — Discord OAuth App

1. Go to **discord.com/developers/applications**

2. Click **"New Application"**, name it `GrindLogger`, click **"Create"**

3. In the left sidebar click **"OAuth2"**

4. Under **"Redirects"** add:
   - `https://your-domain.com/auth/discord/callback`
   - `http://localhost:5173/auth/discord/callback` (dev)

5. Click **"Save Changes"**

6. Copy the **Client ID** → `DISCORD_CLIENT_ID`
   Click **"Reset Secret"** → copy it → `DISCORD_CLIENT_SECRET`

---

## Part 3 — Reddit OAuth App

1. Go to **reddit.com/prefs/apps**

2. Scroll to the bottom and click **"create another app..."**

3. Fill in the fields:
   | Field | Value |
   |---|---|
   | **Name** | `GrindLogger` |
   | **Type** | Select **"web app"** |
   | **description** | (optional) |
   | **about url** | `https://your-domain.com` |
   | **redirect uri** | `https://your-domain.com/auth/reddit/callback` |

   > For local dev, set redirect uri to `http://localhost:5173/auth/reddit/callback`.
   > Reddit allows multiple redirect URIs — add both on separate lines.

4. Click **"create app"**

5. The **Client ID** is the short string under the app name (below "web app") → `REDDIT_CLIENT_ID`
   Click **"edit"** to reveal the **secret** → `REDDIT_CLIENT_SECRET`

   > **Note:** Reddit does not expose email addresses via OAuth. Users without a public email
   > will get a synthetic placeholder (`reddit_{id}@reddit.invalid`) stored in the database.
   > They can update their email in Settings after signing in.

---

## Part 4 — Add credentials to your local `.env`

```env
GH_CLIENT_ID=your-github-client-id-here
GH_CLIENT_SECRET=your-github-client-secret-here
DISCORD_CLIENT_ID=your-discord-client-id-here
DISCORD_CLIENT_SECRET=your-discord-client-secret-here
REDDIT_CLIENT_ID=your-reddit-client-id-here
REDDIT_CLIENT_SECRET=your-reddit-client-secret-here
```

---

## Part 5 — Add credentials to GitHub repository secrets (for production deploy)

Go to your GitHub repo → **Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|---|---|
| `GH_CLIENT_ID` | GitHub OAuth App Client ID |
| `GH_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `DISCORD_CLIENT_ID` | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Discord Application Client Secret |
| `REDDIT_CLIENT_ID` | Reddit App Client ID |
| `REDDIT_CLIENT_SECRET` | Reddit App Secret |

> **Important:** GitHub Actions does not allow secrets starting with `GITHUB_` (reserved prefix).
> That's why the GitHub OAuth credentials use the `GH_` prefix.

---

## Summary of env vars

| Variable | Where it's used | Secret? |
|---|---|---|
| `GH_CLIENT_ID` | Backend + Frontend (OAuth URL) | No (store as secret for CI) |
| `GH_CLIENT_SECRET` | Backend only | **Yes** |
| `DISCORD_CLIENT_ID` | Backend + Frontend (OAuth URL) | No (store as secret for CI) |
| `DISCORD_CLIENT_SECRET` | Backend only | **Yes** |
| `REDDIT_CLIENT_ID` | Backend + Frontend (OAuth URL) | No (store as secret for CI) |
| `REDDIT_CLIENT_SECRET` | Backend only | **Yes** |
