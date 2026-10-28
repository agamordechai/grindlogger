/**
 * Authentication against the backend (the website's FastAPI server).
 *
 * Connecting is two steps so nothing is persisted until the user has confirmed what will happen to their data:
 *   1. signIn / signUp — exchange credentials for a token pair, returned in memory only.
 *   2. persistSession — store the server URL + 7-day refresh token (see tokenStore).
 * After that, access tokens (30 min, services/api/src/auth.py) are re-minted at the start of every sync round
 * via refreshAccessToken — no login UI ever reappears day to day.
 */

import { getSyncConfig, setServerAndToken, setRefreshToken } from './tokenStore';
import { errorFromResponse } from './errors';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/** The one GrindLogger server. Overridable for development with VITE_SYNC_SERVER_URL. */
export const SYNC_SERVER_URL: string = import.meta.env.VITE_SYNC_SERVER_URL || 'https://grindlogger.com/api';

/** An authenticated connection that has not been saved yet. */
export interface SyncSession {
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
}

export function normalizeUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/, '');
}

async function requestTokens(serverUrl: string, path: string, body: unknown): Promise<SyncSession> {
  const base = normalizeUrl(serverUrl);
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res);
  const data = (await res.json()) as TokenResponse;
  return { serverUrl: base, accessToken: data.access_token, refreshToken: data.refresh_token };
}

/** Sign in to an existing account. Nothing is stored. */
export function signIn(email: string, password: string, serverUrl = SYNC_SERVER_URL): Promise<SyncSession> {
  return requestTokens(serverUrl, '/auth/login', { email, password });
}

/** Create an account (the server emails a verification link) and sign in. Nothing is stored. */
export function signUp(email: string, name: string, password: string, serverUrl = SYNC_SERVER_URL): Promise<SyncSession> {
  return requestTokens(serverUrl, '/auth/register', { email, name, password });
}

/** Ask the server to email a password-reset link (the link opens the website). */
export async function requestPasswordReset(email: string, serverUrl = SYNC_SERVER_URL): Promise<void> {
  const res = await fetch(`${normalizeUrl(serverUrl)}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await errorFromResponse(res);
}

/** Save the connection so background syncs can run. */
export async function persistSession(session: SyncSession): Promise<void> {
  await setServerAndToken(session.serverUrl, session.refreshToken);
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
  if (!res.ok) throw await errorFromResponse(res);
  const data = (await res.json()) as TokenResponse;
  await setRefreshToken(data.refresh_token);
  return data.access_token;
}
