/**
 * AI provider credential management — replaces the server-side
 * /auth/ai-provider endpoints. The API key lives in secure storage
 * (see keyStore); base_url and model live in the local users table.
 */

import { one, run } from '../db/database';
import { LOCAL_USER_ID } from '../db/schema';
import { getKey, setKey, removeKey } from './keyStore';

const U = LOCAL_USER_ID;

/** Default Anthropic model used when the user hasn't chosen one. */
export const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export interface AIProviderStatus {
  has_key: boolean;
  key_hint: string | null;
  base_url: string | null;
  model: string | null;
}

export interface ResolvedCredentials {
  api_key: string | null;
  base_url: string | null;
  model: string;
}

function hint(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export async function getStatus(): Promise<AIProviderStatus> {
  const key = await getKey();
  const row = await one<{ ai_base_url: string | null; ai_model: string | null }>(
    'SELECT ai_base_url, ai_model FROM users WHERE id = ?',
    [U],
  );
  return {
    has_key: !!key,
    key_hint: key ? hint(key) : null,
    base_url: row?.ai_base_url ?? null,
    model: row?.ai_model ?? null,
  };
}

export async function saveProvider(data: {
  api_key: string;
  base_url?: string | null;
  model?: string | null;
}): Promise<AIProviderStatus> {
  if (data.api_key) await setKey(data.api_key);
  await run('UPDATE users SET ai_base_url = ?, ai_model = ? WHERE id = ?', [
    data.base_url ?? null,
    data.model ?? null,
    U,
  ]);
  return getStatus();
}

export async function deleteProvider(): Promise<void> {
  await removeKey();
  await run('UPDATE users SET ai_base_url = NULL, ai_model = NULL WHERE id = ?', [U]);
}

/** Resolve the credentials the AI layer should use for a request. */
export async function resolveCredentials(): Promise<ResolvedCredentials> {
  const api_key = await getKey();
  const row = await one<{ ai_base_url: string | null; ai_model: string | null }>(
    'SELECT ai_base_url, ai_model FROM users WHERE id = ?',
    [U],
  );
  return {
    api_key,
    base_url: row?.ai_base_url ?? null,
    model: row?.ai_model || DEFAULT_MODEL,
  };
}
