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

/**
 * Forget every link between local rows and the server: remote ids and sync state are cleared and all rows
 * are marked for upload, pending server deletions are dropped. Local data itself is untouched. Connecting
 * (or reconnecting) always starts from here and re-matches rows against the server, so stale ids from an
 * earlier connection (another account or server) can never delete or overwrite anything.
 *
 * `keepProfile` marks the local profile for upload (used when the local profile should overwrite the
 * server's); otherwise the server's profile wins on the next sync.
 */
export async function resetLinkage(keepProfile = false): Promise<void> {
  for (const table of ['exercises', 'workout_sessions', 'body_measurements']) {
    await run(`UPDATE ${table} SET remote_id = NULL, remote_updated_at = NULL, dirty = 1`, []);
  }
  await run('DELETE FROM sync_deletions', []);
  await run(
    keepProfile
      ? 'UPDATE users SET profile_remote_updated_at = NULL, profile_dirty = 1 WHERE id = ?'
      : 'UPDATE users SET profile_remote_updated_at = NULL, profile_dirty = 0 WHERE id = ?',
    [U],
  );
}

/** Disconnect: drop the server + tokens and unlink all rows. The phone keeps all of its data. */
export async function clearSync(): Promise<void> {
  await run(
    'UPDATE users SET sync_server_url = NULL, sync_refresh_token = NULL, sync_last_synced_at = NULL WHERE id = ?',
    [U],
  );
  await resetLinkage();
}
