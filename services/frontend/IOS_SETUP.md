# GrindLogger — iOS Setup & Offline Guide

GrindLogger now runs **entirely on your iPhone**. All workout data lives in a local
SQLite database; the AI coach calls Anthropic directly with your key. No AWS, no
server, no internet needed except for AI.

Everything up to the actual Xcode build has been done for you. The steps below are the
ones that require a Mac with full Xcode + your iPhone — they can't be automated.

---

## 1. One-time prerequisites

- **Xcode** (full app, from the Mac App Store — the Command Line Tools alone are not
  enough). Launch it once to finish component install.
- **CocoaPods**: `brew install cocoapods`

## 2. Generate the native iOS project

From `services/frontend`:

```bash
npm install            # if you haven't already
npm run build          # produces dist/
npm run ios:add        # creates the ios/ Xcode project (runs pod install)
```

## 3. Add the required Info.plist keys

Open `ios/App/App/Info.plist` (via `npm run ios:open` → App → Info) and add:

| Key | Value | Why |
|---|---|---|
| `NSAppTransportSecurity` → `NSAllowsLocalNetworking` = `YES` | boolean | allow the OTA update download from your Mac over plain-HTTP LAN |
| `NSLocalNetworkUsageDescription` | "GrindLogger checks your Mac for app updates over WiFi." | iOS local-network permission prompt |

(Anthropic is HTTPS, so it needs no exception.)

## 4. Install on your iPhone — 100% free

Everything here uses a **free Apple ID** and **free Xcode**. There is **no $99 Apple
Developer Program** and no cost of any kind.

A free Apple ID signature lasts **7 days**. There are two free ways to handle that — pick
one:

### Option A — AltStore (recommended: set-and-forget, no weekly chore)
[AltStore](https://altstore.io) is free and re-signs your app **automatically over WiFi**
using your own Apple ID, so you never manually re-sign.

1. Install **AltServer** on your Mac and **AltStore** on your iPhone (free — follow
   altstore.io; you sign in with your free Apple ID).
2. Build the app package:
   ```bash
   npm run ios:ipa        # produces releases/GrindLogger.ipa (unsigned; AltStore signs it)
   ```
3. AirDrop `releases/GrindLogger.ipa` to the phone → open **AltStore → My Apps → +** →
   pick it. AltStore signs & installs it.
4. Keep AltServer running on the Mac. While your phone and Mac are on the same WiFi,
   AltStore refreshes the signature in the background — the app just keeps working, and
   **your data is never touched**.

### Option B — Xcode Run (simplest, but re-Run ~weekly)
```bash
npm run ios:open       # opens Xcode
```
1. Plug in your iPhone, select it as the run target.
2. **App** target → **Signing & Capabilities** → check *Automatically manage signing* →
   **Team = your Apple ID** (add it with "Add an Account…"). If bundle id
   `com.grindlogger.app` is taken, change it to e.g. `com.<yourname>.grindlogger`.
3. Press **Run** (▶). First run on the phone: **Settings → General → VPN & Device
   Management → [your Apple ID] → Trust**.
4. Every ~7 days, plug in and press Run again to re-sign (this is the chore Option A
   avoids). Your data persists across re-signs.

## 5. Set your AI key & restore your history

- **AI key:** open the app → profile menu → **Settings → API Key** → paste your Anthropic
  key (`sk-ant-…`). Stored on-device only; sent only to Anthropic.
- **Restore data:** AirDrop `~/Desktop/grindlogger-backup.json` to the iPhone (or put it
  in iCloud Drive / Files). In the app: **Settings → Restore from Backup → Choose Backup
  File**. This loads your 52 exercises, 68 sessions and 12 measurements.

---

## 6. Updating the app over WiFi (OTA)

OTA swaps the **web bundle** (React/UI/logic) without the App Store or re-signing. Native
changes (new Capacitor plugin, Info.plist, icons) still need an Xcode rebuild.

**First time — tell the app where to look.** On your Mac, from `services/frontend`:

```bash
npm run ota:serve
```

It prints a line like:

```
VITE_OTA_MANIFEST_URL=http://10.100.102.2:4599/manifest.json npm run ios:sync
```

Stop it (Ctrl+C), run that exact `VITE_OTA_MANIFEST_URL=… npm run ios:sync` once, and
re-run from Xcode. Now the app knows your Mac's update URL.

**From then on**, to ship a change: on the same WiFi, run `npm run ota:serve` again and
re-open the app on your phone — it downloads the new bundle and reloads into it.

> Your Mac's LAN IP can change between sessions. If OTA stops finding updates, re-run
> `npm run ota:serve`, note the new IP, and re-sync once with the new
> `VITE_OTA_MANIFEST_URL`.

---

## What runs where

| Concern | Where |
|---|---|
| Exercises, sessions, sets, measurements, streaks, progress | on-device SQLite (`@capacitor-community/sqlite`) |
| AI coach (chat, recommend, analyze, overload) | Anthropic API, called directly from the app |
| AI key | on-device (Capacitor Preferences) |
| App updates | your Mac over WiFi (Capgo self-hosted) |
| Login / OAuth / server / Postgres / Redis / Docker | **removed** — none of it runs anymore |

The old backend (`services/api`, `services/ai_coach`, `services/worker`) remains in the
repo only as reference for what was ported; it is no longer used at runtime.
