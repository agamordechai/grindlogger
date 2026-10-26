import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/database', () => import('../test/fakeDb'));

import { all, one, resetDb, run } from '../test/fakeDb';
import { BASE, FakeServer } from '../test/fakeServer';
import { archiveExercise, createSuperset, reorderExercises } from '../db/repositories/exercises';
import { runSync } from './engine';
import { setServerAndToken } from './tokenStore';

interface ExerciseRow {
  id: number;
  name: string;
  archived: number;
  sort_order: number;
  superset_group: number | null;
  remote_id: number | null;
  dirty: number;
  weight: number | null;
}

let server: FakeServer;

async function addLocalExercise(name: string, extra: Record<string, unknown> = {}): Promise<number> {
  const cols = { name, sets: 3, reps: 10, workout_day: 'A', ...extra };
  const keys = Object.keys(cols);
  const res = await run(
    `INSERT INTO exercises (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => cols[k as keyof typeof cols]),
  );
  return res.lastId as number;
}

const localExercises = () => all<ExerciseRow>('SELECT * FROM exercises ORDER BY id', []);

beforeEach(async () => {
  await resetDb();
  server = new FakeServer();
  server.install();
  await setServerAndToken(BASE, 'refresh1');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('exercise sync', () => {
  it('uploads new exercises with archived state, order and never asks the server to log a session', async () => {
    await addLocalExercise('Bench', { archived: 1, sort_order: 5 });
    expect((await runSync()).ok).toBe(true);

    const [remote] = [...server.exercises.values()];
    expect(remote).toMatchObject({ name: 'Bench', archived: true, sort_order: 5 });

    const [local] = await localExercises();
    expect(local).toMatchObject({ remote_id: remote.id, dirty: 0 });

    // an edit to the synced row is a PATCH that opts out of auto-logging
    await run('UPDATE exercises SET weight = 80, dirty = 1 WHERE id = ?', [local.id]);
    await runSync();
    expect(server.calls.some((c) => c.startsWith(`PATCH /exercises/${remote.id}?auto_log=false`))).toBe(true);
    expect(server.exercises.get(remote.id)?.weight).toBe(80);
  });

  it('pulls archived exercises, ordering and superset membership', async () => {
    server.addExercise({ name: 'A', archived: true, sort_order: 2 });
    const b = server.addExercise({ name: 'B', sort_order: 1, superset_group: 4 });
    server.addExercise({ name: 'C', sort_order: 0, superset_group: 4 });

    await runSync();
    const rows = await localExercises();
    expect(rows).toHaveLength(3);
    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName.A.archived).toBe(1);
    expect(byName.B).toMatchObject({ sort_order: 1, superset_group: 4, remote_id: b.id });
    expect(byName.C.superset_group).toBe(4);

    // a later remote change to the archived/order state reaches the device
    server.touchExercise(b.id, { archived: true, sort_order: 9, superset_group: null });
    await runSync();
    expect((await localExercises()).find((r) => r.name === 'B')).toMatchObject({
      archived: 1,
      sort_order: 9,
      superset_group: null,
    });
  });

  it('pushes local archive / reorder / superset edits made with the real repository functions', async () => {
    const a = await addLocalExercise('A');
    const b = await addLocalExercise('B');
    const c = await addLocalExercise('C');
    await runSync();

    await archiveExercise(c);
    await reorderExercises([{ id: a, sort_order: 7 }]);
    await createSuperset([a, b]);
    await runSync();

    const rows = Object.fromEntries((await localExercises()).map((r) => [r.name, r]));
    const remote = (name: string) => [...server.exercises.values()].find((e) => e.name === name)!;
    expect(remote('C').archived).toBe(true);
    expect(remote('A').sort_order).toBe(7);
    expect(remote('A').superset_group).not.toBeNull();
    expect(remote('A').superset_group).toBe(remote('B').superset_group);
    // local ids were rewritten to the server's group id and everything is clean
    expect(rows.A.superset_group).toBe(remote('A').superset_group);
    expect(rows.B.superset_group).toBe(remote('A').superset_group);
    expect(Object.values(rows).every((r) => r.dirty === 0)).toBe(true);
  });

  it('does not merge a new offline superset into a server group that happens to use the same number', async () => {
    // Device: A and B grouped offline as local group 1 (never synced).
    const a = await addLocalExercise('A', { superset_group: 1 });
    const b = await addLocalExercise('B', { superset_group: 1 });
    // Server already has an unrelated group 1.
    server.addExercise({ name: 'X', superset_group: 1 });
    server.addExercise({ name: 'Y', superset_group: 1 });

    await runSync();
    const rows = Object.fromEntries((await localExercises()).map((r) => [r.name, r]));
    expect(rows.A.superset_group).toBe(rows.B.superset_group);
    expect(rows.X.superset_group).toBe(1);
    expect(rows.A.superset_group).not.toBe(rows.X.superset_group);
    expect([a, b]).toHaveLength(2);
  });

  it('turns a one-member offline group into a plain exercise', async () => {
    await addLocalExercise('Solo', { superset_group: 3 });
    await runSync();
    expect((await localExercises())[0].superset_group).toBeNull();
    expect([...server.exercises.values()][0].superset_group).toBeNull();
  });

  it('recreates an exercise that was deleted on the server while it had unsent local edits', async () => {
    const id = await addLocalExercise('Row');
    await runSync();
    const first = (await localExercises())[0];
    server.exercises.delete(first.remote_id as number);

    await run('UPDATE exercises SET weight = 60, dirty = 1 WHERE id = ?', [id]);
    expect((await runSync()).ok).toBe(true);

    const rows = await localExercises();
    expect(rows).toHaveLength(1);
    expect(server.exercises.size).toBe(1);
    expect([...server.exercises.values()][0]).toMatchObject({ name: 'Row', weight: 60 });
    expect(rows[0].remote_id).toBe([...server.exercises.values()][0].id);
  });

  it('keeps unsent local edits when the server has a newer copy, and removes clean rows deleted remotely', async () => {
    const keep = await addLocalExercise('Keep');
    const gone = await addLocalExercise('Gone');
    await runSync();
    const remoteOf = async (id: number) =>
      (await one<{ remote_id: number }>('SELECT remote_id FROM exercises WHERE id = ?', [id]))!.remote_id;

    server.touchExercise(await remoteOf(keep), { weight: 100 });
    server.exercises.delete(await remoteOf(gone));
    await run('UPDATE exercises SET weight = 50, dirty = 1 WHERE id = ?', [keep]);
    await runSync();

    const rows = await localExercises();
    expect(rows.map((r) => r.name)).toEqual(['Keep']); // clean "Gone" was deleted remotely
    expect(rows[0].weight).toBe(50); // local edit wins and was pushed
    expect([...server.exercises.values()][0].weight).toBe(50);
  });
});

describe('session sync', () => {
  it('does not drop old synced sessions and only downloads sessions that changed', async () => {
    const old = server.addSession('2019-03-04', 'A');
    const recent = server.addSession('2026-05-01', 'B');

    await runSync();
    const sessions = await all<{ remote_id: number }>('SELECT remote_id FROM workout_sessions ORDER BY id', []);
    expect(sessions.map((s) => s.remote_id).sort()).toEqual([old.id, recent.id].sort());

    server.calls.length = 0;
    await runSync();
    expect(server.calls.filter((c) => /GET \/sessions\/\d+/.test(c))).toHaveLength(0);
    expect(server.calls).toContain('GET /sessions/index');
    expect(await all('SELECT id FROM workout_sessions', [])).toHaveLength(2);

    // a change on the server is picked up with one detail fetch
    server.sessions.get(recent.id)!.notes = 'felt strong';
    server.sessions.get(recent.id)!.updated_at = '2030-01-01T00:00:00.000Z';
    server.calls.length = 0;
    await runSync();
    expect(server.calls.filter((c) => /GET \/sessions\/\d+/.test(c))).toHaveLength(1);
    expect((await one<{ notes: string }>('SELECT notes FROM workout_sessions WHERE remote_id = ?', [recent.id]))?.notes).toBe(
      'felt strong',
    );
  });

  it('removes a clean session deleted on the server and keeps one with unsent edits', async () => {
    const a = server.addSession('2026-01-01', 'A');
    const b = server.addSession('2026-01-02', 'A');
    await runSync();

    server.sessions.delete(a.id);
    server.sessions.delete(b.id);
    await run('UPDATE workout_sessions SET dirty = 1 WHERE remote_id = ?', [b.id]);
    await runSync();

    const left = await all<{ workout_date: string }>('SELECT workout_date FROM workout_sessions', []);
    expect(left.map((r) => r.workout_date)).toEqual(['2026-01-02']);
  });
});

describe('profile sync', () => {
  it('takes the server profile when nothing was edited locally, and keeps units when the server has none', async () => {
    await run("UPDATE users SET units = 'imperial' WHERE id = 1", []);
    await runSync();
    const u = await one<{ name: string; units: string }>('SELECT name, units FROM users WHERE id = 1', []);
    expect(u).toEqual({ name: 'Server Name', units: 'imperial' }); // server units null => device keeps its own

    // ...and shares it with the account on the next round
    await runSync();
    expect(server.profile.units).toBe('imperial');
  });

  it('pushes local profile edits instead of overwriting them', async () => {
    await run("UPDATE users SET name = 'Alice', cycle_length = 5, units = 'imperial', profile_dirty = 1 WHERE id = 1", []);
    await runSync();
    expect(server.profile).toMatchObject({ name: 'Alice', cycle_length: 5, units: 'imperial' });
    const u = await one<{ name: string; profile_dirty: number }>('SELECT name, profile_dirty FROM users WHERE id = 1', []);
    expect(u).toEqual({ name: 'Alice', profile_dirty: 0 });

    // then a change made on the website arrives
    server.profile = { ...server.profile, name: 'Alice W', profile_updated_at: '2030-01-01T00:00:00.000Z' };
    await runSync();
    expect((await one<{ name: string }>('SELECT name FROM users WHERE id = 1', []))?.name).toBe('Alice W');
  });
});

describe('failure handling', () => {
  it('reports a failed round without losing local changes', async () => {
    await addLocalExercise('Bench');
    server.failOnce.set('POST /exercises', 500);
    const result = await runSync();
    expect(result.ok).toBe(false);
    expect((await localExercises())[0]).toMatchObject({ dirty: 1, remote_id: null });

    expect((await runSync()).ok).toBe(true);
    expect((await localExercises())[0].dirty).toBe(0);
  });
});
