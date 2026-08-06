/**
 * Storage for the Anthropic API key.
 *
 * - Web (dev / PWA): localStorage.
 * - Native iOS: Capacitor Preferences, which persists in the app's sandboxed
 *   store (survives app restarts, wiped on uninstall). The key is only ever sent
 *   to Anthropic. Swap `@capacitor/preferences` for a Keychain plugin here if you
 *   want hardware-backed storage — this module is the single point of change.
 */

import { Capacitor } from '@capacitor/core';

const KEY = 'grindlogger_ai_api_key';
const isNative = Capacitor.isNativePlatform();

async function prefs() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

export async function getKey(): Promise<string | null> {
  if (isNative) {
    const { value } = await (await prefs()).get({ key: KEY });
    return value ?? null;
  }
  return localStorage.getItem(KEY);
}

export async function setKey(value: string): Promise<void> {
  if (isNative) {
    await (await prefs()).set({ key: KEY, value });
    return;
  }
  localStorage.setItem(KEY, value);
}

export async function removeKey(): Promise<void> {
  if (isNative) {
    await (await prefs()).remove({ key: KEY });
    return;
  }
  localStorage.removeItem(KEY);
}
