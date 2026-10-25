/**
 * Connecting this device to a server account for the first time.
 *
 * A phone that has been used offline and an account that has been used on the website both hold data, and the
 * rows on each side have never been linked. Syncing blindly would upload everything as new rows and duplicate
 * whatever the account already has. So connecting is a deliberate step:
 *
 *   1. preparePlan  — read what the server holds and match it against local rows by natural key.
 *   2. (UI)         — nothing to decide if either side is empty; otherwise the user confirms a choice.
 *   3. applyFirstConnect — take a safety snapshot, link/wipe accordingly, save the connection, and run a sync.
 *
 * Nothing is persisted (no tokens saved, no rows touched) until step 3.
 */

import { all, run } from '../db/database';
import { LOCAL_USER_ID } from '../db/schema';
import { latestSnapshot, takeSnapshot, wipeWorkoutData, type SnapshotInfo } from '../db/snapshot';
import { persistSession, type SyncSession } from './auth';
import { apiDelete, setAccessToken } from './client';
import {
  fetchAllRemoteExercises,
  fetchRemoteMeasurements,
  fetchRemoteSessionIndex,
  runSync,
  type RemoteExercise,
  type RemoteMeasurement,
  type RemoteSessionIndexItem,
} from './engine';
import { resetLinkage } from './tokenStore';

const U = LOCAL_USER_ID;

export interface Counts {
  exercises: number;
  sessions: number;
  measurements: number;
}

/** [localId, remoteId] */
export type Match = [number, number];

export interface FirstConnectPlan {
  local: Counts;
  remote: Counts;
  /** Rows that exist on both sides (same natural key). They keep the server's version. */
  matched: Counts;
  /** Rows only on this device: they will be uploaded. */
  localOnly: Counts;
  /** Rows only on the server: they will be downloaded. */
  remoteOnly: Counts;
  matches: { exercises: Match[]; sessions: Match[]; measurements: Match[] };
  /** What the user needs to decide: nothing unless both sides already hold data. */
  scenario: 'empty' | 'upload' | 'download' | 'merge';
}

/** What happens to the data at connect time. `merge` is the default; the others discard one side's rows. */
export type ConnectAction = 'merge' | 'replace-local' | 'overwrite-server';

export interface ConnectSummary {
  action: ConnectAction;
  uploaded: Counts;
  downloaded: Counts;
  linked: Counts;
  snapshot: SnapshotInfo | null;
  /** Set if the connection was saved but the first sync round failed (it will retry in the background). */
  syncError?: string;
}

export const sumCounts = (c: Counts): number => c.exercises + c.sessions + c.measurements;

const zero = (): Counts => ({ exercises: 0, sessions: 0, measurements: 0 });

// ---------- natural keys ----------

const dayPart = (d: string): string => String(d).slice(0, 10);

export const exerciseKey = (name: string, workoutDay: string): string =>
  `${name.trim().toLowerCase()}|${workoutDay}`;
export const sessionKey = (date: string, workoutDay: string): string => `${dayPart(date)}|${workoutDay}`;
export const measurementKey = (date: string): string => dayPart(date);

/**
 * Pair local and remote rows that share a key, one-to-one. When several rows share a key (two "Bench Press"
 * on day A) they pair off in id order, and any extras stay unmatched.
 */
export function matchByKey(
  local: { id: number; key: string }[],
  remote: { id: number; key: string }[],
): Match[] {
  const pool = new Map<string, number[]>();
  for (const r of [...remote].sort((a, b) => a.id - b.id)) {
    const list = pool.get(r.key) ?? [];
    list.push(r.id);
    pool.set(r.key, list);
  }
  const matches: Match[] = [];
  for (const l of [...local].sort((a, b) => a.id - b.id)) {
    const candidates = pool.get(l.key);
    if (candidates && candidates.length > 0) matches.push([l.id, candidates.shift() as number]);
  }
  return matches;
}

// ---------- plan ----------

export async function localCounts(): Promise<Counts> {
  const count = async (table: string): Promise<number> =>
    (await all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`, [U]))[0]?.n ?? 0;
  return {
    exercises: await count('exercises'),
    sessions: await count('workout_sessions'),
    measurements: await count('body_measurements'),
  };
}

interface LocalKeys {
  exercises: { id: number; key: string }[];
  sessions: { id: number; key: string }[];
  measurements: { id: number; key: string }[];
}

async function loadLocalKeys(): Promise<LocalKeys> {
  const ex = await all<{ id: number; name: string; workout_day: string }>(
    'SELECT id, name, workout_day FROM exercises WHERE user_id = ?',
    [U],
  );
  const se = await all<{ id: number; workout_date: string; workout_day: string }>(
    'SELECT id, workout_date, workout_day FROM workout_sessions WHERE user_id = ?',
    [U],
  );
  const me = await all<{ id: number; measurement_date: string }>(
    'SELECT id, measurement_date FROM body_measurements WHERE user_id = ?',
    [U],
  );
  return {
    exercises: ex.map((r) => ({ id: r.id, key: exerciseKey(r.name, r.workout_day) })),
    sessions: se.map((r) => ({ id: r.id, key: sessionKey(r.workout_date, r.workout_day) })),
    measurements: me.map((r) => ({ id: r.id, key: measurementKey(r.measurement_date) })),
  };
}

/** Pure planner: works out the scenario and counts from the two sides' keys. */
export function buildPlan(
  local: LocalKeys,
  remote: { exercises: RemoteExercise[]; sessions: RemoteSessionIndexItem[]; measurements: RemoteMeasurement[] },
): FirstConnectPlan {
  const matches = {
    exercises: matchByKey(local.exercises, remote.exercises.map((r) => ({ id: r.id, key: exerciseKey(r.name, r.workout_day) }))),
    sessions: matchByKey(local.sessions, remote.sessions.map((r) => ({ id: r.id, key: sessionKey(r.date, r.workout_day) }))),
    measurements: matchByKey(local.measurements, remote.measurements.map((r) => ({ id: r.id, key: measurementKey(r.date) }))),
  };
  const localC: Counts = {
    exercises: local.exercises.length,
    sessions: local.sessions.length,
    measurements: local.measurements.length,
  };
  const remoteC: Counts = {
    exercises: remote.exercises.length,
    sessions: remote.sessions.length,
    measurements: remote.measurements.length,
  };
  const matched: Counts = {
    exercises: matches.exercises.length,
    sessions: matches.sessions.length,
    measurements: matches.measurements.length,
  };
  const diff = (a: Counts, b: Counts): Counts => ({
    exercises: a.exercises - b.exercises,
    sessions: a.sessions - b.sessions,
    measurements: a.measurements - b.measurements,
  });
  const localHas = sumCounts(localC) > 0;
  const remoteHas = sumCounts(remoteC) > 0;
  const scenario = !localHas && !remoteHas ? 'empty' : !remoteHas ? 'upload' : !localHas ? 'download' : 'merge';

  return {
    local: localC,
    remote: remoteC,
    matched,
    localOnly: diff(localC, matched),
    remoteOnly: diff(remoteC, matched),
    matches,
    scenario,
  };
}

/** Read the account's data with the (unsaved) session and compare it with this device. Changes nothing. */
export async function preparePlan(session: SyncSession): Promise<FirstConnectPlan> {
  setAccessToken(session.accessToken);
  const [exercises, sessions, measurements] = await Promise.all([
    fetchAllRemoteExercises(session.serverUrl),
    fetchRemoteSessionIndex(session.serverUrl),
    fetchRemoteMeasurements(session.serverUrl),
  ]);
  return buildPlan(await loadLocalKeys(), { exercises, sessions, measurements });
}

// ---------- apply ----------

async function linkMatches(plan: FirstConnectPlan): Promise<void> {
  // Link with remote_updated_at left empty and the row clean: the normal pull then sees a "changed" remote
  // row and overwrites the local copy with the server's version.
  const tables: [keyof FirstConnectPlan['matches'], string][] = [
    ['exercises', 'exercises'],
    ['sessions', 'workout_sessions'],
    ['measurements', 'body_measurements'],
  ];
  for (const [kind, table] of tables) {
    for (const [localId, remoteId] of plan.matches[kind]) {
      await run(`UPDATE ${table} SET remote_id = ?, remote_updated_at = NULL, dirty = 0 WHERE id = ?`, [
        remoteId,
        localId,
      ]);
    }
  }
}

async function clearServerData(session: SyncSession): Promise<void> {
  const base = session.serverUrl;
  await apiDelete(base, '/exercises'); // removes every exercise of the account, archived included
  for (const s of await fetchRemoteSessionIndex(base)) await apiDelete(base, `/sessions/${s.id}`);
  for (const m of await fetchRemoteMeasurements(base)) await apiDelete(base, `/measurements/${m.id}`);
}

/**
 * Carry out the chosen action, save the connection and run the first sync round.
 * A snapshot of this device's data is taken first whenever the device holds any.
 */
export async function applyFirstConnect(
  session: SyncSession,
  plan: FirstConnectPlan,
  action: ConnectAction = 'merge',
): Promise<ConnectSummary> {
  setAccessToken(session.accessToken);

  let snapshot: SnapshotInfo | null = null;
  if (sumCounts(plan.local) > 0) {
    snapshot = await takeSnapshot(`Before connecting to ${session.serverUrl}`);
  }

  // Start from a clean slate so stale ids from an earlier connection can never delete or overwrite anything.
  await resetLinkage(action === 'overwrite-server');

  let uploaded = plan.localOnly;
  let downloaded = plan.remoteOnly;
  let linked = plan.matched;

  if (action === 'merge') {
    await linkMatches(plan);
  } else if (action === 'replace-local') {
    await wipeWorkoutData();
    uploaded = zero();
    downloaded = plan.remote;
    linked = zero();
  } else {
    await clearServerData(session);
    uploaded = plan.local;
    downloaded = zero();
    linked = zero();
  }

  await persistSession(session);
  const result = await runSync();

  return {
    action,
    uploaded,
    downloaded,
    linked,
    snapshot: snapshot ?? (await latestSnapshot()),
    syncError: result.ok ? undefined : result.error,
  };
}
