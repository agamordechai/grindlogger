/**
 * Authentication against the (optional, future) redeployed backend.
 *
 * One-time login exchanges email/password for a token pair; only the 7-day
 * refresh token is persisted (see tokenStore). Access tokens are short-lived
 * (30 min, services/api/src/auth.py) and are re-minted at the start of every
 * sync round via refreshAccessToken — no login UI ever reappears day to day.
 */

import { getSyncConfig, setServerAndToken, setRefreshToken } from './tokenStore';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

function normalizeUrl(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, '');
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.detail || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

/** One-time login. Stores the server URL + refresh token; returns a fresh access token. */
export async function login(serverUrl: string, email: string, password: string): Promise<string> {
  const base = normalizeUrl(serverUrl);
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as TokenResponse;
  await setServerAndToken(base, data.refresh_token);
  return data.access_token;
}

/**
 * Exchange the stored refresh token for a fresh access token, storing the
 * rotated refresh token the server returns. Returns null if sync isn't
 * configured (no server/refresh token stored) — callers should treat that as
 * "sync disabled, skip silently."
 */
export async function refreshAccessToken(): Promise<string | null> {
  const { serverUrl, refreshToken } = await getSyncConfig();
  if (!serverUrl || !refreshToken) return null;

  const res = await fetch(`${serverUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as TokenResponse;
  await setRefreshToken(data.refresh_token);
  return data.access_token;
}
