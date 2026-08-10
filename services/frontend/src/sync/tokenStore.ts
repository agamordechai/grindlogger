/**
 * Storage for the sync server URL and refresh token. Mirrors
 * src/ai/keyStore.ts + src/ai/credentials.ts exactly (secret + config both
 * live in the local `users` row — the one storage path proven reliable in
 * the iOS WebView).
 */

import { one, run } from '../db/database';
import { LOCAL_USER_ID } from '../db/schema';

const U = LOCAL_USER_ID;

export interface SyncConfig {
  serverUrl: string | null;
  refreshToken: string | null;
  lastSyncedAt: string | null;
}

export async function getSyncConfig(): Promise<SyncConfig> {
  const row = await one<{
    sync_server_url: string | null;
    sync_refresh_token: string | null;
    sync_last_synced_at: string | null;
  }>('SELECT sync_server_url, sync_refresh_token, sync_last_synced_at FROM users WHERE id = ?', [U]);
  return {
    serverUrl: row?.sync_server_url ?? null,
    refreshToken: row?.sync_refresh_token ?? null,
    lastSyncedAt: row?.sync_last_synced_at ?? null,
  };
}

export async function setServerAndToken(serverUrl: string, refreshToken: string): Promise<void> {
  await run('UPDATE users SET sync_server_url = ?, sync_refresh_token = ? WHERE id = ?', [
    serverUrl,
    refreshToken,
    U,
  ]);
}

export async function setRefreshToken(refreshToken: string): Promise<void> {
  await run('UPDATE users SET sync_refresh_token = ? WHERE id = ?', [refreshToken, U]);
}

export async function setLastSyncedAt(iso: string): Promise<void> {
  await run('UPDATE users SET sync_last_synced_at = ? WHERE id = ?', [iso, U]);
}

export async function clearSync(): Promise<void> {
  await run(
    'UPDATE users SET sync_server_url = NULL, sync_refresh_token = NULL, sync_last_synced_at = NULL WHERE id = ?',
    [U],
  );
}
