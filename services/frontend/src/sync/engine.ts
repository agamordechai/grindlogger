/**
 * The sync engine — one runSync() call pushes local changes, then pulls the
 * server's full lists and diffs them locally. See the sync-layer plan for the
 * design rationale (full-list-diff avoids needing server-side tombstones or a
 * `?since=` API; conflicts resolve last-write-wins by updated_at).
 *
 * Scope (v1): exercise archive/reorder/superset state stays local-only —
 * only the core editable fields (name/sets/reps/weight/workout_day/notes/
 * per_side) sync, matching what PATCH /exercises/{id} actually accepts.
 * Conversations and the user profile are not synced.
 */

import { all, one, run } from '../db/database';
import { LOCAL_USER_ID } from '../db/schema';
import { refreshAccessToken } from './auth';
import { apiGet, apiSend, apiDelete, is404, setAccessToken } from './client';
import { getSyncConfig, setLastSyncedAt } from './tokenStore';

const U = LOCAL_USER_ID;
const SESSION_LOOKBACK_MONTHS = 24;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface RemoteExercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
  notes: string | null;
  per_side: boolean;
  archived: boolean;
  sort_order: number;
  superset_group: number | null;
  updated_at: string;
}

interface RemoteSetDetail {
  set_number: number;
  reps: number;
  weight: number | null;
  set_type: string;
}
interface RemoteSessionExercise {
  exercise_name: string;
  sets_completed: number;
  reps_completed: number;
  weight_used: number | null;
  one_rep_max: number | null;
  order: number;
  sets: RemoteSetDetail[];
}
interface RemoteSession {
  id: number;
  date: string;
  workout_day: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  exercises: RemoteSessionExercise[];
}

interface RemoteMeasurement {
  id: number;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  bicep_left_cm: number | null;
  bicep_right_cm: number | null;
  thigh_left_cm: number | null;
  thigh_right_cm: number | null;
  neck_cm: number | null;
  shoulders_cm: number | null;
  forearm_cm: number | null;
  calf_cm: number | null;
  notes: string | null;
  updated_at: string;
}

// ---------- push ----------

async function pushExercises(serverUrl: string): Promise<void> {
  const dirty = await all<any>('SELECT * FROM exercises WHERE user_id = ? AND dirty = 1', [U]);
  for (const row of dirty) {
    const body = {
      name: row.name,
      sets: row.sets,
      reps: row.reps,
      weight: row.weight,
      workout_day: row.workout_day,
      notes: row.notes,
      per_side: !!row.per_side,
    };
    try {
      if (row.remote_id == null) {
        const created = await apiSend<RemoteExercise>(serverUrl, 'POST', '/exercises', body);
        await run('UPDATE exercises SET remote_id = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          created.id,
          created.updated_at,
          row.id,
        ]);
      } else {
        const updated = await apiSend<RemoteExercise>(serverUrl, 'PATCH', `/exercises/${row.remote_id}`, body);
        await run('UPDATE exercises SET remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          updated.updated_at,
          row.id,
        ]);
      }
    } catch (e) {
      if (is404(e)) {
        await run('UPDATE exercises SET remote_id = NULL, remote_updated_at = NULL, dirty = 0 WHERE id = ?', [
          row.id,
        ]);
      } else {
        throw e;
      }
    }
  }
}

function sessionPushBody(full: {
  date: string;
  workout_day: string;
  notes: string | null;
  duration_minutes: number | null;
  exercises: {
    exercise_name: string;
    sets_completed: number;
    reps_completed: number;
    weight_used: number | null;
    one_rep_max: number | null;
    order: number;
    sets: { set_number: number; reps: number; weight: number | null; set_type: string }[];
  }[];
}) {
  return {
    date: full.date,
    workout_day: full.workout_day,
    notes: full.notes,
    duration_minutes: full.duration_minutes,
    exercises: full.exercises.map((ex) => ({
      exercise_name: ex.exercise_name,
      sets_completed: ex.sets_completed,
      reps_completed: ex.reps_completed,
      weight_used: ex.weight_used,
      one_rep_max: ex.one_rep_max,
      order: ex.order,
      sets: ex.sets.map((s) => ({ set_number: s.set_number, reps: s.reps, weight: s.weight, set_type: s.set_type })),
    })),
  };
}

async function pushSessions(serverUrl: string): Promise<void> {
  const { getSession } = await import('../db/repositories/sessions');
  const dirty = await all<{ id: number; remote_id: number | null }>(
    'SELECT id, remote_id FROM workout_sessions WHERE user_id = ? AND dirty = 1',
    [U],
  );
  for (const row of dirty) {
    const full = await getSession(row.id);
    const body = sessionPushBody(full);
    try {
      if (row.remote_id == null) {
        const created = await apiSend<RemoteSession>(serverUrl, 'POST', '/sessions', body);
        await run('UPDATE workout_sessions SET remote_id = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          created.id,
          created.updated_at,
          row.id,
        ]);
      } else {
        const updated = await apiSend<RemoteSession>(serverUrl, 'PUT', `/sessions/${row.remote_id}`, body);
        await run('UPDATE workout_sessions SET remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          updated.updated_at,
          row.id,
        ]);
      }
    } catch (e) {
      if (is404(e)) {
        await run(
          'UPDATE workout_sessions SET remote_id = NULL, remote_updated_at = NULL, dirty = 0 WHERE id = ?',
          [row.id],
        );
      } else {
        throw e;
      }
    }
  }
}

function measurementBody(row: any) {
  return {
    date: row.measurement_date ?? row.date,
    weight_kg: row.weight_kg,
    body_fat_pct: row.body_fat_pct,
    chest_cm: row.chest_cm,
    waist_cm: row.waist_cm,
    hips_cm: row.hips_cm,
    bicep_left_cm: row.bicep_left_cm,
    bicep_right_cm: row.bicep_right_cm,
    thigh_left_cm: row.thigh_left_cm,
    thigh_right_cm: row.thigh_right_cm,
    neck_cm: row.neck_cm,
    shoulders_cm: row.shoulders_cm,
    forearm_cm: row.forearm_cm,
    calf_cm: row.calf_cm,
    notes: row.notes,
  };
}

async function pushMeasurements(serverUrl: string): Promise<void> {
  const dirty = await all<any>('SELECT * FROM body_measurements WHERE user_id = ? AND dirty = 1', [U]);
  for (const row of dirty) {
    const body = measurementBody(row);
    try {
      if (row.remote_id == null) {
        const created = await apiSend<RemoteMeasurement>(serverUrl, 'POST', '/measurements', body);
        await run('UPDATE body_measurements SET remote_id = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          created.id,
          created.updated_at,
          row.id,
        ]);
      } else {
        const updated = await apiSend<RemoteMeasurement>(serverUrl, 'PUT', `/measurements/${row.remote_id}`, body);
        await run('UPDATE body_measurements SET remote_updated_at = ?, dirty = 0 WHERE id = ?', [
          updated.updated_at,
          row.id,
        ]);
      }
    } catch (e) {
      if (is404(e)) {
        await run(
          'UPDATE body_measurements SET remote_id = NULL, remote_updated_at = NULL, dirty = 0 WHERE id = ?',
          [row.id],
        );
      } else {
        throw e;
      }
    }
  }
}

async function pushDeletions(serverUrl: string): Promise<void> {
  const pending = await all<{ table_name: string; remote_id: number }>('SELECT * FROM sync_deletions', []);
  const endpointFor: Record<string, string> = {
    exercises: '/exercises',
    workout_sessions: '/sessions',
    body_measurements: '/measurements',
  };
  for (const p of pending) {
    const path = endpointFor[p.table_name];
    if (!path) continue;
    await apiDelete(serverUrl, `${path}/${p.remote_id}`);
    await run('DELETE FROM sync_deletions WHERE table_name = ? AND remote_id = ?', [p.table_name, p.remote_id]);
  }
}

// ---------- pull ----------

async function fetchAllRemoteExercises(serverUrl: string): Promise<RemoteExercise[]> {
  const items: RemoteExercise[] = [];
  let page = 1;
  for (;;) {
    const resp = await apiGet<{ items: RemoteExercise[]; total: number }>(
      serverUrl,
      `/exercises?page=${page}&page_size=200`,
    );
    items.push(...resp.items);
    if (items.length >= resp.total || resp.items.length === 0) break;
    page += 1;
  }
  return items;
}

async function pullExercises(serverUrl: string): Promise<void> {
  const remoteItems = await fetchAllRemoteExercises(serverUrl);
  const localRows = await all<{ id: number; remote_id: number | null; dirty: number; remote_updated_at: string | null }>(
    'SELECT id, remote_id, dirty, remote_updated_at FROM exercises WHERE user_id = ?',
    [U],
  );
  const localByRemoteId = new Map(localRows.filter((r) => r.remote_id != null).map((r) => [r.remote_id as number, r]));
  const remoteIds = new Set(remoteItems.map((r) => r.id));

  for (const remote of remoteItems) {
    const local = localByRemoteId.get(remote.id);
    if (!local) {
      await run(
        `INSERT INTO exercises (name, sets, reps, weight, workout_day, notes, user_id, archived, sort_order, superset_group, per_side, remote_id, remote_updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0)`,
        [
          remote.name,
          remote.sets,
          remote.reps,
          remote.weight,
          remote.workout_day,
          remote.notes,
          U,
          remote.sort_order,
          remote.superset_group,
          remote.per_side ? 1 : 0,
          remote.id,
          remote.updated_at,
        ],
      );
    } else if (local.dirty === 0 && local.remote_updated_at !== remote.updated_at) {
      // Only the core PATCH-able fields — archive/reorder/superset state stays local-only (v1 scope).
      await run(
        `UPDATE exercises SET name = ?, sets = ?, reps = ?, weight = ?, workout_day = ?, notes = ?, per_side = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?`,
        [remote.name, remote.sets, remote.reps, remote.weight, remote.workout_day, remote.notes, remote.per_side ? 1 : 0, remote.updated_at, local.id],
      );
    }
  }

  for (const local of localRows) {
    if (local.remote_id != null && !remoteIds.has(local.remote_id) && local.dirty === 0) {
      await run('DELETE FROM exercises WHERE id = ?', [local.id]);
    }
  }
}

async function fetchRemoteSessionSummaries(serverUrl: string): Promise<{ id: number }[]> {
  const out: { id: number }[] = [];
  const now = new Date();
  for (let i = 0; i < SESSION_LOOKBACK_MONTHS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const items = await apiGet<{ id: number }[]>(
      serverUrl,
      `/sessions/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`,
    );
    out.push(...items);
  }
  return out;
}

async function insertLocalSessionFromRemote(full: RemoteSession): Promise<void> {
  const res = await run(
    `INSERT INTO workout_sessions (user_id, workout_date, workout_day, notes, duration_minutes, created_at, remote_id, remote_updated_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [U, full.date, full.workout_day, full.notes, full.duration_minutes, full.created_at, full.id, full.updated_at],
  );
  await writeSessionChildren(res.lastId!, full.exercises);
}

async function overwriteLocalSessionFromRemote(localId: number, full: RemoteSession): Promise<void> {
  await run(
    'UPDATE workout_sessions SET workout_date = ?, workout_day = ?, notes = ?, duration_minutes = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?',
    [full.date, full.workout_day, full.notes, full.duration_minutes, full.updated_at, localId],
  );
  const oldEx = await all<{ id: number }>('SELECT id FROM session_exercises WHERE session_id = ?', [localId]);
  for (const ex of oldEx) await run('DELETE FROM set_details WHERE session_exercise_id = ?', [ex.id]);
  await run('DELETE FROM session_exercises WHERE session_id = ?', [localId]);
  await writeSessionChildren(localId, full.exercises);
}

async function writeSessionChildren(sessionId: number, exercises: RemoteSessionExercise[]): Promise<void> {
  for (const ex of exercises) {
    const res = await run(
      'INSERT INTO session_exercises (session_id, exercise_name, sets_completed, reps_completed, weight_used, one_rep_max, "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, ex.exercise_name, ex.sets_completed, ex.reps_completed, ex.weight_used, ex.one_rep_max, ex.order],
    );
    const sxId = res.lastId!;
    for (const s of ex.sets) {
      await run(
        'INSERT INTO set_details (session_exercise_id, set_number, reps, weight, set_type) VALUES (?, ?, ?, ?, ?)',
        [sxId, s.set_number, s.reps, s.weight, s.set_type],
      );
    }
  }
}

async function deleteLocalSessionCascade(localId: number): Promise<void> {
  const exRows = await all<{ id: number }>('SELECT id FROM session_exercises WHERE session_id = ?', [localId]);
  for (const ex of exRows) await run('DELETE FROM set_details WHERE session_exercise_id = ?', [ex.id]);
  await run('DELETE FROM session_exercises WHERE session_id = ?', [localId]);
  await run('DELETE FROM workout_sessions WHERE id = ?', [localId]);
}

async function pullSessions(serverUrl: string): Promise<void> {
  const summaries = await fetchRemoteSessionSummaries(serverUrl);
  const localRows = await all<{ id: number; remote_id: number | null; dirty: number; remote_updated_at: string | null }>(
    'SELECT id, remote_id, dirty, remote_updated_at FROM workout_sessions WHERE user_id = ?',
    [U],
  );
  const localByRemoteId = new Map(localRows.filter((r) => r.remote_id != null).map((r) => [r.remote_id as number, r]));
  const remoteIds = new Set(summaries.map((s) => s.id));

  // The calendar summary doesn't carry updated_at, so we fetch full detail for
  // every remote session to decide. Acceptable at personal-fitness-log scale.
  for (const summary of summaries) {
    const local = localByRemoteId.get(summary.id);
    if (!local) {
      const full = await apiGet<RemoteSession>(serverUrl, `/sessions/${summary.id}`);
      await insertLocalSessionFromRemote(full);
    } else if (local.dirty === 0) {
      const full = await apiGet<RemoteSession>(serverUrl, `/sessions/${summary.id}`);
      if (local.remote_updated_at !== full.updated_at) {
        await overwriteLocalSessionFromRemote(local.id, full);
      }
    }
  }

  for (const local of localRows) {
    if (local.remote_id != null && !remoteIds.has(local.remote_id) && local.dirty === 0) {
      await deleteLocalSessionCascade(local.id);
    }
  }
}

async function pullMeasurements(serverUrl: string): Promise<void> {
  const remoteItems = await apiGet<RemoteMeasurement[]>(serverUrl, '/measurements');
  const localRows = await all<{ id: number; remote_id: number | null; dirty: number; remote_updated_at: string | null }>(
    'SELECT id, remote_id, dirty, remote_updated_at FROM body_measurements WHERE user_id = ?',
    [U],
  );
  const localByRemoteId = new Map(localRows.filter((r) => r.remote_id != null).map((r) => [r.remote_id as number, r]));
  const remoteIds = new Set(remoteItems.map((r) => r.id));

  for (const remote of remoteItems) {
    const local = localByRemoteId.get(remote.id);
    const b = measurementBody(remote);
    if (!local) {
      await run(
        `INSERT INTO body_measurements (user_id, measurement_date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, neck_cm, shoulders_cm, forearm_cm, calf_cm, notes, remote_id, remote_updated_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          U, b.date, b.weight_kg, b.body_fat_pct, b.chest_cm, b.waist_cm, b.hips_cm, b.bicep_left_cm,
          b.bicep_right_cm, b.thigh_left_cm, b.thigh_right_cm, b.neck_cm, b.shoulders_cm, b.forearm_cm,
          b.calf_cm, b.notes, remote.id, remote.updated_at,
        ],
      );
    } else if (local.dirty === 0 && local.remote_updated_at !== remote.updated_at) {
      await run(
        `UPDATE body_measurements SET measurement_date = ?, weight_kg = ?, body_fat_pct = ?, chest_cm = ?, waist_cm = ?, hips_cm = ?, bicep_left_cm = ?, bicep_right_cm = ?, thigh_left_cm = ?, thigh_right_cm = ?, neck_cm = ?, shoulders_cm = ?, forearm_cm = ?, calf_cm = ?, notes = ?, remote_updated_at = ?, dirty = 0 WHERE id = ?`,
        [
          b.date, b.weight_kg, b.body_fat_pct, b.chest_cm, b.waist_cm, b.hips_cm, b.bicep_left_cm,
          b.bicep_right_cm, b.thigh_left_cm, b.thigh_right_cm, b.neck_cm, b.shoulders_cm, b.forearm_cm,
          b.calf_cm, b.notes, remote.updated_at, local.id,
        ],
      );
    }
  }

  for (const local of localRows) {
    if (local.remote_id != null && !remoteIds.has(local.remote_id) && local.dirty === 0) {
      await run('DELETE FROM body_measurements WHERE id = ?', [local.id]);
    }
  }
}

// ---------- orchestration ----------

let syncing = false;

export interface SyncResult {
  ok: boolean;
  error?: string;
}

/** Run one push-then-pull sync round. No-ops silently if sync isn't configured. */
export async function runSync(): Promise<SyncResult> {
  if (syncing) return { ok: false, error: 'Sync already in progress' };
  syncing = true;
  try {
    const { serverUrl, refreshToken } = await getSyncConfig();
    if (!serverUrl || !refreshToken) return { ok: false, error: 'not-configured' };

    const token = await refreshAccessToken();
    if (!token) return { ok: false, error: 'not-configured' };
    setAccessToken(token);

    await pushExercises(serverUrl);
    await pushSessions(serverUrl);
    await pushMeasurements(serverUrl);
    await pushDeletions(serverUrl);

    await pullExercises(serverUrl);
    await pullMeasurements(serverUrl);
    await pullSessions(serverUrl);

    const now = new Date().toISOString();
    await setLastSyncedAt(now);
    return { ok: true };
  } catch (e) {
    console.warn('[sync] round failed:', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    syncing = false;
  }
}

/** Not currently used by runSync (kept for the Settings UI / tests). */
export async function getUserRow(): Promise<Record<string, unknown> | null> {
  return one('SELECT * FROM users WHERE id = ?', [U]);
}
