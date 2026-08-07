/**
 * Local single-user profile — replaces the server-side auth/user endpoints.
 * There is exactly one user (LOCAL_USER_ID); "login" is implicit.
 */

import type { User } from '../../types/auth';
import { all, one, run, toBool } from '../database';
import { LOCAL_USER_ID } from '../schema';

const U = LOCAL_USER_ID;

interface UserRow {
  id: number;
  email: string;
  name: string;
  picture_url: string | null;
  role: string;
  cycle_length: number;
}

export async function getCurrentUser(): Promise<User> {
  const r = await one<UserRow>('SELECT * FROM users WHERE id = ?', [U]);
  if (!r) throw new Error('Local user missing');
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    picture_url: r.picture_url ?? null,
    role: r.role,
    cycle_length: r.cycle_length,
  };
}

export async function updateProfile(data: { name?: string; cycle_length?: number }): Promise<User> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (data.name !== undefined) {
    sets.push('name = ?');
    vals.push(data.name);
  }
  if (data.cycle_length !== undefined) {
    sets.push('cycle_length = ?');
    vals.push(Math.max(1, Math.min(26, data.cycle_length)));
  }
  if (sets.length) {
    vals.push(U);
    await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);
  }
  return getCurrentUser();
}

/** The cycle_length the AI uses for workout-day enums. */
export async function getCycleLength(): Promise<number> {
  const r = await one<{ cycle_length: number }>('SELECT cycle_length FROM users WHERE id = ?', [U]);
  return r?.cycle_length ?? 7;
}

/** Wipe all workout data (local equivalent of "delete account"). */
export async function deleteAccount(): Promise<void> {
  for (const t of [
    'set_details',
    'session_exercises',
    'workout_sessions',
    'exercises',
    'body_measurements',
    'conversations',
  ]) {
    await run(`DELETE FROM ${t}`, []);
  }
  await run('UPDATE users SET name = ?, cycle_length = 7, google_calendar_enabled = 0 WHERE id = ?', [
    'Me',
    U,
  ]);
}

export { all, toBool };
