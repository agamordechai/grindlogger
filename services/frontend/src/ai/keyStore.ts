/**
 * Storage for the Anthropic API key.
 *
 * The key lives in the local SQLite `users` table (app-sandboxed on iOS, same
 * as any on-device store). We deliberately use the DB rather than a native
 * plugin because the SQLite path is the one proven to work reliably in the iOS
 * WebView; a plugin call behind a dynamic import stalled the Settings screen.
 */

import { one, run } from '../db/database';
import { LOCAL_USER_ID } from '../db/schema';

const U = LOCAL_USER_ID;

export async function getKey(): Promise<string | null> {
  const row = await one<{ ai_api_key: string | null }>(
    'SELECT ai_api_key FROM users WHERE id = ?',
    [U],
  );
  return row?.ai_api_key ?? null;
}

export async function setKey(value: string): Promise<void> {
  await run('UPDATE users SET ai_api_key = ? WHERE id = ?', [value, U]);
}

export async function removeKey(): Promise<void> {
  await run('UPDATE users SET ai_api_key = NULL WHERE id = ?', [U]);
}
