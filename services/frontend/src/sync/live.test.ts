/**
 * Opt-in integration test: the real sync engine against a real running API (no fake server).
 *
 *   # in one terminal: run the API (SQLite is fine), e.g.
 *     DB_PATH=/tmp/live.db RATELIMIT_ENABLED=false uvicorn services.api.src.api:app --port 8123
 *   # then:
 *   LIVE_API_URL=http://127.0.0.1:8123 npm test -- src/sync/live.test.ts
 *
 * Skipped unless LIVE_API_URL is set. It registers a throwaway account on that server.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/database', () => import('../test/fakeDb'));

import { all, one, resetDb, run } from '../test/fakeDb';
import { archiveExercise, createSuperset, reorderExercises } from '../db/repositories/exercises';
import { signUp } from './auth';
import { applyFirstConnect, preparePlan } from './firstConnect';
import { runSync } from './engine';
import { setAccessToken } from './client';

const LIVE = process.env.LIVE_API_URL;

interface RemoteExercise {
  id: number;
  name: string;
  archived: boolean;
  sort_order: number;
  superset_group: number | null;
  weight: number | null;
}

describe.skipIf(!LIVE)('live API', () => {
  let token = '';
  const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${LIVE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return (await res.json()) as T;
  };
  const remoteExercises = async () =>
    (await get<{ items: RemoteExercise[] }>('/exercises?page_size=200&include_archived=true')).items;

  beforeEach(async () => {
    await resetDb();
  });

  it('connects, merges and keeps archive / order / superset / profile in sync with the real server', async () => {
    const email = `live-${Date.now()}@example.com`;
    const session = await signUp(email, 'Live Tester', 'a-long-password', LIVE!);
    token = session.accessToken;
    setAccessToken(token);

    // Phone data made offline
    const ex = async (name: string) =>
      (await run("INSERT INTO exercises (name, sets, reps, workout_day) VALUES (?, 3, 10, 'A')", [name])).lastId as number;
    const a = await ex('Bench');
    const b = await ex('Squat');
    const c = await ex('Row');
    await run("INSERT INTO workout_sessions (workout_date, workout_day, notes) VALUES ('2026-03-01', 'A', 'offline')", []);
    await run("INSERT INTO body_measurements (measurement_date, weight_kg) VALUES ('2026-03-01', 80)", []);
    await run("UPDATE users SET name = 'Phone Name', cycle_length = 5, units = 'imperial', profile_dirty = 1 WHERE id = 1", []);

    // 1. first connect uploads (server is empty)
    const plan = await preparePlan(session);
    expect(plan.scenario).toBe('upload');
    const summary = await applyFirstConnect(session, plan, 'merge');
    expect(summary.syncError).toBeUndefined();
    expect((await remoteExercises()).map((e) => e.name).sort()).toEqual(['Bench', 'Row', 'Squat']);
    expect((await get<unknown[]>('/sessions/index')).length).toBe(1);
    expect((await get<unknown[]>('/measurements')).length).toBe(1);
    // the account's profile wins on first connect; the phone's unit choice follows on the next round
    expect(await get('/auth/me')).toMatchObject({ name: 'Live Tester', units: null });
    expect((await runSync()).ok).toBe(true);
    expect(await get('/auth/me')).toMatchObject({ name: 'Live Tester', units: 'imperial' });

    // 2. archive + reorder + superset made offline reach the server, and no workout session is auto-logged
    await run('UPDATE exercises SET weight = 90, dirty = 1 WHERE id = ?', [a]);
    await archiveExercise(c);
    await reorderExercises([{ id: a, sort_order: 4 }]);
    await createSuperset([a, b]);
    expect((await runSync()).ok).toBe(true);

    const remote = Object.fromEntries((await remoteExercises()).map((e) => [e.name, e]));
    expect(remote.Row.archived).toBe(true);
    expect(remote.Bench).toMatchObject({ sort_order: 4, weight: 90 });
    expect(remote.Bench.superset_group).not.toBeNull();
    expect(remote.Bench.superset_group).toBe(remote.Squat.superset_group);
    expect((await get<unknown[]>('/sessions/index')).length).toBe(1); // still just the one real session

    // 3. un-superset on the phone
    await run('UPDATE exercises SET superset_group = NULL, dirty = 1 WHERE id IN (?, ?)', [a, b]);
    expect((await runSync()).ok).toBe(true);
    const after = Object.fromEntries((await remoteExercises()).map((e) => [e.name, e]));
    expect(after.Bench.superset_group).toBeNull();
    expect(after.Squat.superset_group).toBeNull();

    // 4. a change made "on the website" arrives on the phone
    await fetch(`${LIVE}/exercises/${remote.Squat.id}?auto_log=false`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: 120 }),
    });
    expect((await runSync()).ok).toBe(true);
    expect((await one<{ weight: number }>("SELECT weight FROM exercises WHERE name = 'Squat'", []))?.weight).toBe(120);

    // 5. a fresh phone on the same account downloads everything, archived state included, without duplicates
    await resetDb();
    const second = await preparePlan({ ...session, accessToken: token });
    expect(second.scenario).toBe('download');
    await applyFirstConnect({ ...session, accessToken: token }, second, 'merge');
    const rows = await all<{ name: string; archived: number }>('SELECT name, archived FROM exercises ORDER BY name', []);
    expect(rows).toEqual([
      { name: 'Bench', archived: 0 },
      { name: 'Row', archived: 1 },
      { name: 'Squat', archived: 0 },
    ]);
    expect(await all('SELECT id FROM workout_sessions', [])).toHaveLength(1);
    expect(await one('SELECT name, units FROM users WHERE id = 1', [])).toEqual({
      name: 'Live Tester',
      units: 'imperial',
    });
  }, 60_000);
});
