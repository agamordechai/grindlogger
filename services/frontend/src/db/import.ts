/**
 * One-time restore of a GrindLogger backup into the on-device database.
 *
 * The backup JSON is produced from the old server's Postgres dump. Rows are
 * inserted with their original primary keys so the session → session_exercise
 * → set_detail relationships stay intact; everything is scoped to the single
 * local user (LOCAL_USER_ID).
 */

import { tx } from './database';
import { LOCAL_USER_ID } from './schema';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BackupData {
  meta?: Record<string, unknown>;
  user?: { name?: string; cycle_length?: number };
  exercises: any[];
  workout_sessions: any[];
  session_exercises: any[];
  set_details: any[];
  body_measurements: any[];
}

export interface ImportCounts {
  exercises: number;
  workout_sessions: number;
  session_exercises: number;
  set_details: number;
  body_measurements: number;
}

const U = LOCAL_USER_ID;

/** Validate that an object looks like a GrindLogger backup. */
export function isBackupData(obj: any): obj is BackupData {
  return (
    obj &&
    Array.isArray(obj.exercises) &&
    Array.isArray(obj.workout_sessions) &&
    Array.isArray(obj.session_exercises) &&
    Array.isArray(obj.set_details) &&
    Array.isArray(obj.body_measurements)
  );
}

export async function importBackup(
  data: BackupData,
  opts: { clear?: boolean } = {},
): Promise<ImportCounts> {
  if (!isBackupData(data)) throw new Error('This file is not a valid GrindLogger backup.');
  const clear = opts.clear ?? true;

  await tx(async (t) => {
    if (clear) {
      for (const table of [
        'set_details',
        'session_exercises',
        'workout_sessions',
        'exercises',
        'body_measurements',
      ]) {
        await t.run(`DELETE FROM ${table} WHERE ${table === 'set_details' || table === 'session_exercises' ? '1=1' : 'user_id = ?'}`,
          table === 'set_details' || table === 'session_exercises' ? [] : [U]);
      }
    }

    for (const e of data.exercises) {
      await t.run(
        `INSERT INTO exercises (id, name, sets, reps, weight, workout_day, notes, user_id, archived, sort_order, superset_group, per_side)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.name, e.sets, e.reps, e.weight ?? null, e.workout_day ?? 'A', e.notes ?? null, U,
         e.archived ? 1 : 0, e.sort_order ?? 0, e.superset_group ?? null, e.per_side ? 1 : 0],
      );
    }

    for (const s of data.workout_sessions) {
      await t.run(
        `INSERT INTO workout_sessions (id, user_id, workout_date, workout_day, notes, duration_minutes, created_at, google_calendar_event_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, U, s.workout_date, s.workout_day, s.notes ?? null, s.duration_minutes ?? null,
         s.created_at ?? new Date().toISOString(), s.google_calendar_event_id ?? null],
      );
    }

    for (const se of data.session_exercises) {
      await t.run(
        `INSERT INTO session_exercises (id, session_id, exercise_name, sets_completed, reps_completed, weight_used, one_rep_max, "order", created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [se.id, se.session_id, se.exercise_name, se.sets_completed ?? 0, se.reps_completed ?? 0,
         se.weight_used ?? null, se.one_rep_max ?? null, se.order ?? 0, se.created_at ?? new Date().toISOString()],
      );
    }

    for (const sd of data.set_details) {
      await t.run(
        `INSERT INTO set_details (id, session_exercise_id, set_number, reps, weight, set_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sd.id, sd.session_exercise_id, sd.set_number, sd.reps ?? 0, sd.weight ?? null,
         sd.set_type ?? 'normal', sd.created_at ?? new Date().toISOString()],
      );
    }

    for (const m of data.body_measurements) {
      await t.run(
        `INSERT INTO body_measurements (id, user_id, measurement_date, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, bicep_left_cm, bicep_right_cm, thigh_left_cm, thigh_right_cm, neck_cm, shoulders_cm, forearm_cm, calf_cm, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, U, m.measurement_date, m.weight_kg ?? null, m.body_fat_pct ?? null, m.chest_cm ?? null,
         m.waist_cm ?? null, m.hips_cm ?? null, m.bicep_left_cm ?? null, m.bicep_right_cm ?? null,
         m.thigh_left_cm ?? null, m.thigh_right_cm ?? null, m.neck_cm ?? null, m.shoulders_cm ?? null,
         m.forearm_cm ?? null, m.calf_cm ?? null, m.notes ?? null, m.created_at ?? new Date().toISOString()],
      );
    }

    if (data.user) {
      await t.run('UPDATE users SET name = ?, cycle_length = ? WHERE id = ?', [
        data.user.name ?? 'Me',
        Math.max(1, Math.min(26, data.user.cycle_length ?? 7)),
        U,
      ]);
    }
  });

  return {
    exercises: data.exercises.length,
    workout_sessions: data.workout_sessions.length,
    session_exercises: data.session_exercises.length,
    set_details: data.set_details.length,
    body_measurements: data.body_measurements.length,
  };
}
