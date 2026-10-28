/**
 * Thin authenticated HTTP client for the sync server. Holds the current
 * access token in memory for the duration of a sync round (re-minted at the
 * start of each round by engine.ts via sync/auth.refreshAccessToken).
 */

import { refreshAccessToken } from './auth';
import { ApiError, errorFromResponse } from './errors';

export { ApiError } from './errors';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** How often one request waits out a rate limit before giving up (a first sync of a long history needs several). */
const MAX_RATE_LIMIT_WAITS = 30;

let sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Tests replace the timer so rate-limit waits finish instantly. */
export function setSleep(fn: (ms: number) => Promise<void>): void {
  sleep = fn;
}

/** Seconds to wait from a 429: the API's `retry_after` body field, then the Retry-After header, else 60. */
async function retryAfterSeconds(res: Response): Promise<number> {
  let seconds = Number(res.headers.get('Retry-After'));
  try {
    const body = await res.clone().json();
    if (typeof body?.retry_after === 'number') seconds = body.retry_after;
  } catch {
    // no JSON body
  }
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 120) : 60;
}

/**
 * Tell the UI that sync is paused for a rate limit (`seconds` > 0) or has resumed (0).
 * Settings and the sign-in screen show it instead of failing.
 */
function notifyWaiting(seconds: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('sync-waiting', { detail: { seconds } }));
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
  // Rate limited (e.g. the server allows 30 new sessions a minute): wait as asked and carry on, so a large
  // first upload finishes in one round instead of failing.
  for (let waits = 0; res.status === 429 && waits < MAX_RATE_LIMIT_WAITS; waits++) {
    const seconds = await retryAfterSeconds(res);
    notifyWaiting(seconds);
    await sleep(seconds * 1000);
    notifyWaiting(0);
    res = await doFetch();
  }
  return res;
}

export async function apiGet<T>(serverUrl: string, path: string): Promise<T> {
  const res = await request(serverUrl, path, { method: 'GET' });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  serverUrl: string,
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await request(serverUrl, path, { method, body: JSON.stringify(body) });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json() as Promise<T>;
}

/** Returns true on success, false on 404 (already gone — treated as success by callers). */
export async function apiDelete(serverUrl: string, path: string): Promise<boolean> {
  const res = await request(serverUrl, path, { method: 'DELETE' });
  if (res.status === 404) return false;
  if (!res.ok) throw await errorFromResponse(res);
  return true;
}

/** True if an error thrown by this module represents a 404 (row gone remotely). */
export function is404(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}
