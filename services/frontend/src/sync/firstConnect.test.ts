import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/database', () => import('../test/fakeDb'));

import { all, one, resetDb, run } from '../test/fakeDb';
import { BASE, FakeServer } from '../test/fakeServer';
import { restoreSnapshot } from '../db/snapshot';
import type { SyncSession } from './auth';
import {
  applyFirstConnect,
  buildPlan,
  exerciseKey,
  matchByKey,
  measurementKey,
  preparePlan,
  sessionKey,
  sumCounts,
} from './firstConnect';
import { clearSync, getSyncConfig } from './tokenStore';

let server: FakeServer;

const session: SyncSession = { serverUrl: BASE, accessToken: 'access', refreshToken: 'refresh1' };

async function addLocalExercise(name: string, extra: Record<string, unknown> = {}): Promise<number> {
  const cols = { name, sets: 3, reps: 10, workout_day: 'A', ...extra };
  const keys = Object.keys(cols);
  const res = await run(
    `INSERT INTO exercises (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => cols[k as keyof typeof cols]),
  );
  return res.lastId as number;
}

async function addLocalSession(date: string, day = 'A', notes: string | null = null): Promise<number> {
  const res = await run('INSERT INTO workout_sessions (workout_date, workout_day, notes) VALUES (?, ?, ?)', [
    date,
    day,
    notes,
  ]);
  return res.lastId as number;
}

async function addLocalMeasurement(date: string, weight: number | null = null): Promise<void> {
  await run('INSERT INTO body_measurements (measurement_date, weight_kg) VALUES (?, ?)', [date, weight]);
}

const names = async () =>
  (await all<{ name: string }>('SELECT name FROM exercises ORDER BY name', [])).map((r) => r.name);
const serverNames = () => [...server.exercises.values()].map((e) => e.name).sort();

beforeEach(async () => {
  await resetDb();
  server = new FakeServer();
  server.install();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('matching by natural key', () => {
  it('normalises keys', () => {
    expect(exerciseKey('  Bench Press ', 'A')).toBe(exerciseKey('bench press', 'A'));
    expect(exerciseKey('Bench Press', 'A')).not.toBe(exerciseKey('Bench Press', 'B'));
    expect(sessionKey('2026-01-02T10:00:00', 'A')).toBe('2026-01-02|A');
    expect(measurementKey('2026-01-02T00:00:00Z')).toBe('2026-01-02');
  });

  it('pairs rows one-to-one and leaves duplicates unmatched', () => {
    const local = [
      { id: 1, key: 'a' },
      { id: 2, key: 'a' },
      { id: 3, key: 'b' },
    ];
    const remote = [
      { id: 10, key: 'a' },
      { id: 11, key: 'c' },
    ];
    expect(matchByKey(local, remote)).toEqual([[1, 10]]);
  });
});

describe('planning', () => {
  const emptyRemote = { exercises: [], sessions: [], measurements: [] };
  const emptyLocal = { exercises: [], sessions: [], measurements: [] };

  it.each([
    ['empty', emptyLocal, emptyRemote],
    ['upload', { ...emptyLocal, exercises: [{ id: 1, key: 'a|A' }] }, emptyRemote],
  ])('scenario %s', (scenario, local, remote) => {
    expect(buildPlan(local, remote).scenario).toBe(scenario);
  });

  it('download when only the server has data, merge when both do', async () => {
    server.addExercise({ name: 'Bench' });
    expect((await preparePlan(session)).scenario).toBe('download');

    await addLocalExercise('Squat');
    const plan = await preparePlan(session);
    expect(plan.scenario).toBe('merge');
    expect(plan.localOnly.exercises).toBe(1);
    expect(plan.remoteOnly.exercises).toBe(1);
    expect(plan.matched.exercises).toBe(0);
  });
});

describe('connecting', () => {
  async function seedBoth() {
    // phone
    await addLocalExercise('Bench', { weight: 60 });
    await addLocalExercise('Squat');
    await addLocalSession('2026-02-01', 'A', 'phone notes');
    await addLocalSession('2026-02-03', 'B');
    await addLocalMeasurement('2026-02-01', 80);
    // server
    server.addExercise({ name: 'bench', weight: 70 }); // same exercise as the phone's "Bench"
    server.addExercise({ name: 'Row' });
    server.addSession('2026-02-01', 'A').notes = 'server notes'; // same workout as the phone's
    server.addSession('2026-02-05', 'A');
    server.addMeasurement('2026-02-01', 81);
    server.addMeasurement('2026-02-09', 79);
  }

  it('merge: keeps everything from both sides without duplicates, and the server wins on rows present in both', async () => {
    await seedBoth();
    const plan = await preparePlan(session);
    expect(plan.matched).toEqual({ exercises: 1, sessions: 1, measurements: 1 });
    expect(plan.localOnly).toEqual({ exercises: 1, sessions: 1, measurements: 0 });
    expect(plan.remoteOnly).toEqual({ exercises: 1, sessions: 1, measurements: 1 });

    const summary = await applyFirstConnect(session, plan, 'merge');
    expect(summary.syncError).toBeUndefined();

    expect(await names()).toEqual(['Row', 'Squat', 'bench']);
    expect(serverNames()).toEqual(['Row', 'Squat', 'bench']); // Squat uploaded, nothing duplicated
    expect(server.exercises.size).toBe(3);
    expect(server.sessions.size).toBe(3);
    expect(server.measurements.size).toBe(2);

    // matched rows took the server's version
    expect((await one<{ weight: number }>("SELECT weight FROM exercises WHERE lower(name) = 'bench'", []))?.weight).toBe(70);
    expect(
      (await one<{ notes: string }>("SELECT notes FROM workout_sessions WHERE workout_date = '2026-02-01'", []))?.notes,
    ).toBe('server notes');
    expect((await one<{ weight_kg: number }>("SELECT weight_kg FROM body_measurements WHERE measurement_date = '2026-02-01'", []))?.weight_kg).toBe(81);

    // everything is linked and clean, and the connection is saved
    const dirty = await all('SELECT id FROM exercises WHERE dirty = 1 OR remote_id IS NULL', []);
    expect(dirty).toHaveLength(0);
    expect((await getSyncConfig()).refreshToken).toBeTruthy();

    // a second sync is a no-op (idempotent)
    const before = [server.exercises.size, server.sessions.size, server.measurements.size];
    server.calls.length = 0;
    const again = await applyFirstConnect(session, await preparePlan(session), 'merge');
    expect(again.syncError).toBeUndefined();
    expect([server.exercises.size, server.sessions.size, server.measurements.size]).toEqual(before);
  });

  it('uploads everything when the server is empty and downloads everything when the phone is empty', async () => {
    await addLocalExercise('Bench');
    await addLocalSession('2026-02-01');
    const up = await applyFirstConnect(session, await preparePlan(session), 'merge');
    expect(sumCounts(up.uploaded)).toBe(2);
    expect(serverNames()).toEqual(['Bench']);
    expect(server.sessions.size).toBe(1);

    // fresh phone, same account
    await resetDb();
    await clearSync();
    const down = await applyFirstConnect(session, await preparePlan(session), 'merge');
    expect(sumCounts(down.downloaded)).toBe(2);
    expect(await names()).toEqual(['Bench']);
    expect(await all('SELECT id FROM workout_sessions', [])).toHaveLength(1);
    expect(down.snapshot).toBeNull(); // nothing on the phone to protect
  });

  it('replace-local: the phone ends up with exactly the server data and a restorable snapshot exists', async () => {
    await seedBoth();
    const plan = await preparePlan(session);
    const summary = await applyFirstConnect(session, plan, 'replace-local');

    expect(await names()).toEqual(['Row', 'bench']);
    expect(serverNames()).toEqual(['Row', 'bench']); // server untouched
    expect(await all('SELECT id FROM workout_sessions', [])).toHaveLength(2);
    expect(summary.snapshot).not.toBeNull();

    // restoring puts the phone's original rows back, and disconnects
    await restoreSnapshot(summary.snapshot!.id);
    await clearSync();
    expect(await names()).toEqual(['Bench', 'Squat']);
    expect(await all('SELECT id FROM workout_sessions', [])).toHaveLength(2);
    expect((await getSyncConfig()).refreshToken).toBeNull();
    expect(await all('SELECT id FROM exercises WHERE remote_id IS NOT NULL', [])).toHaveLength(0);
  });

  it('overwrite-server: the account ends up with exactly the phone data', async () => {
    await seedBoth();
    const plan = await preparePlan(session);
    await applyFirstConnect(session, plan, 'overwrite-server');

    expect(serverNames()).toEqual(['Bench', 'Squat']);
    expect([...server.sessions.values()].map((s) => s.date).sort()).toEqual(['2026-02-01', '2026-02-03']);
    expect(server.measurements.size).toBe(1);
    expect(await names()).toEqual(['Bench', 'Squat']);
  });

  it('local profile only overwrites the account when asked to', async () => {
    await run("UPDATE users SET name = 'Phone Name', profile_dirty = 1 WHERE id = 1", []);
    await addLocalExercise('Bench');
    server.addExercise({ name: 'Row' });

    await applyFirstConnect(session, await preparePlan(session), 'merge');
    expect(server.profile.name).toBe('Server Name');
    expect((await one<{ name: string }>('SELECT name FROM users WHERE id = 1', []))?.name).toBe('Server Name');
  });
});

describe('disconnecting', () => {
  it('keeps the data but forgets every server link, so a later reconnect re-matches instead of duplicating', async () => {
    await addLocalExercise('Bench');
    await applyFirstConnect(session, await preparePlan(session), 'merge');
    expect(await all('SELECT id FROM exercises WHERE remote_id IS NOT NULL', [])).toHaveLength(1);

    await run('INSERT INTO sync_deletions (table_name, remote_id) VALUES (?, ?)', ['exercises', 99]);
    await clearSync();

    expect(await names()).toEqual(['Bench']);
    const row = await one<{ remote_id: number | null; dirty: number }>('SELECT remote_id, dirty FROM exercises', []);
    expect(row).toEqual({ remote_id: null, dirty: 1 });
    expect(await all('SELECT * FROM sync_deletions', [])).toHaveLength(0);
    expect(await getSyncConfig()).toMatchObject({ serverUrl: null, refreshToken: null });

    // reconnect to the same account: matched, not duplicated
    const plan = await preparePlan(session);
    expect(plan.matched.exercises).toBe(1);
    await applyFirstConnect(session, plan, 'merge');
    expect(serverNames()).toEqual(['Bench']);
    expect(await names()).toEqual(['Bench']);
  });
});
