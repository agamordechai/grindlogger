/**
 * Native-app-only startup: the on-device SQLite web component (when running in a browser during development),
 * OTA bundle updates, and background sync. Loaded dynamically from main.tsx so the website bundle never
 * contains any of it.
 */

import { Capacitor } from '@capacitor/core';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';
import { initOTA } from '../ota';
import { runSync } from '../sync/engine';

/** Must run before the first render: the local database initialises when the app mounts. */
export function prepareNative(): void {
  // On the web (development), the on-device SQLite store is provided by the jeep-sqlite web component.
  // Register it and mount the element; on native iOS this is skipped and the native SQLite plugin is used.
  if (Capacitor.getPlatform() === 'web') {
    defineJeepSqlite(window);
    if (!document.querySelector('jeep-sqlite')) {
      document.body.appendChild(document.createElement('jeep-sqlite'));
    }
  }
}

/** Runs after the first render. */
export function startNativeServices(): void {
  // Check for an OTA web-bundle update over WiFi (native only; no-op on web).
  void initOTA();

  // Sync with the configured server, if any (silent no-op when sync isn't set up — offline stays the
  // default). Runs on launch and whenever connectivity returns; also exposed as "Sync Now" in Settings.
  void runSync();
  window.addEventListener('online', () => void runSync());
}
