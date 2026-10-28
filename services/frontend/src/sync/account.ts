/**
 * Native app sign-in state, shared by the sign-in screen, the profile menu and Settings.
 *
 * Signed in = connected to the GrindLogger server (a stored refresh token). Signing in goes through
 * firstConnect.ts; signing out keeps the phone's data (see tokenStore.clearSync). A user can also choose to
 * use the app without an account, which hides the sign-in screen until they ask for it again.
 */

import { clearSync, getSignInSkipped, getSyncConfig, setSignInSkipped } from './tokenStore';

export interface AccountState {
  signedIn: boolean;
  /** "Continue without an account" was chosen. */
  skipped: boolean;
}

let current: AccountState | null = null;
const listeners = new Set<(s: AccountState) => void>();

async function reload(): Promise<AccountState> {
  const { refreshToken } = await getSyncConfig();
  current = { signedIn: !!refreshToken, skipped: await getSignInSkipped() };
  for (const fn of listeners) fn(current);
  return current;
}

export function getAccountState(): Promise<AccountState> {
  return current ? Promise.resolve(current) : reload();
}

export function subscribeAccount(fn: (s: AccountState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Tell the app the profile row changed (AuthContext reloads the user). */
function notifyProfile(): void {
  window.dispatchEvent(new Event('profile-synced'));
}

/** Call after firstConnect.applyFirstConnect has saved the connection. */
export async function markSignedIn(): Promise<void> {
  await setSignInSkipped(false);
  await reload();
  notifyProfile();
}

export async function signOut(): Promise<void> {
  await clearSync();
  await setSignInSkipped(false);
  await reload();
  notifyProfile();
  window.dispatchEvent(new Event('data-synced'));
}

export async function skipSignIn(): Promise<void> {
  await setSignInSkipped(true);
  await reload();
}

/** Show the sign-in screen again (from Settings or the profile menu while signed out). */
export async function showSignIn(): Promise<void> {
  await setSignInSkipped(false);
  await reload();
}
