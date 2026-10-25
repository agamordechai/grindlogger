/**
 * Email verification and password-reset calls. Website only (the native app has no accounts);
 * built on the website's axios client so token refresh and auth headers behave the same.
 */

import api from './remote';

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/auth/verify-email', { token });
}

export async function resendVerification(): Promise<void> {
  await api.post('/auth/resend-verification');
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password });
}

/** Pull a readable message out of an axios error from the API (FastAPI puts it in `detail`). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  return err instanceof Error ? err.message : fallback;
}
