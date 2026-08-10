/**
 * Thin authenticated HTTP client for the sync server. Holds the current
 * access token in memory for the duration of a sync round (re-minted at the
 * start of each round by engine.ts via sync/auth.refreshAccessToken).
 */

import { refreshAccessToken } from './auth';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.detail || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

async function request(serverUrl: string, path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(`${serverUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await doFetch();
  if (res.status === 401) {
    // Access token expired mid-round (or was never set) — refresh once and retry.
    const fresh = await refreshAccessToken();
    if (fresh) {
      accessToken = fresh;
      res = await doFetch();
    }
  }
  return res;
}

export async function apiGet<T>(serverUrl: string, path: string): Promise<T> {
  const res = await request(serverUrl, path, { method: 'GET' });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  serverUrl: string,
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await request(serverUrl, path, { method, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

/** Returns true on success, false on 404 (already gone — treated as success by callers). */
export async function apiDelete(serverUrl: string, path: string): Promise<boolean> {
  const res = await request(serverUrl, path, { method: 'DELETE' });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(await parseError(res));
  return true;
}

/** True if an error thrown by this module represents a 404 (row gone remotely). */
export function is404(err: unknown): boolean {
  return err instanceof Error && /^404\b/.test(err.message);
}
