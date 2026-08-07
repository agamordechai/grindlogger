/**
 * Over-the-air (OTA) web-bundle updates over your home WiFi.
 *
 * On native startup the app fetches a small manifest from a static server you
 * run on your Mac (see scripts/release-local.mjs). If the manifest advertises a
 * version different from the running bundle, it downloads the new zip and swaps
 * to it — no App Store, no re-signing. Native/plugin changes still require an
 * Xcode rebuild.
 *
 * Configure the manifest URL at build time:
 *   VITE_OTA_MANIFEST_URL=http://<your-mac-LAN-IP>:4599/manifest.json
 * If unset, OTA is simply disabled.
 */

import { Capacitor } from '@capacitor/core';

export async function initOTA(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
  // Confirm the current bundle is healthy so Capgo doesn't roll it back.
  await CapacitorUpdater.notifyAppReady();

  const manifestUrl = import.meta.env.VITE_OTA_MANIFEST_URL as string | undefined;
  if (!manifestUrl) return;

  try {
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (!res.ok) return;
    const { version, url } = (await res.json()) as { version?: string; url?: string };
    if (!version || !url) return;

    const current = await CapacitorUpdater.current();
    if (current.bundle.version === version) return; // already up to date

    const bundle = await CapacitorUpdater.download({ url, version });
    await CapacitorUpdater.set(bundle); // reloads the WebView into the new bundle
  } catch (e) {
    console.warn('[OTA] update check failed:', e);
  }
}
