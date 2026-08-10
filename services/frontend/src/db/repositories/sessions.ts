/**
 * Workout session repository — on-device port of
 * services/api/src/database/session_repository.py.
 */

import type {
  WorkoutSession,
  CreateWorkoutSession,
  CreateSessionExercise,
  CreateSetDetail,
  SessionExercise,
  SetDetail,
  SetType,
  WorkoutSessionSummary,
  StreakInfo,
  WeekSummary,
  ExerciseProgress,
  ProgressPoint,
} from '../../types/session';
import { all, one, run } from '../database';
import { LOCAL_USER_ID } from '../schema';

const U = LOCAL_USER_ID;

// ---------- date helpers (date-only, UTC math to avoid DST drift) ----------

function parseISO(d: string): number {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}
function toISODate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function addDays(ms: number, n: number): number {
  return ms + n * 86400000;
}
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ---------- row types ----------

interface SessionRow {
  id: number;
  workout_date: string;
  workout_day: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
}
interface SessionExerciseRow {
  id: number;
  exercise_name: string;
  sets_completed: number;
  reps_completed: number;
  weight_used: number | null;
  one_rep_max: number | null;
  order: number;
}
interface SetDetailRow {
  id: number;
  set_number: number;
  reps: number;
  weight: number | null;
  set_type: string;
}

// ---------- aggregate + response building ----------

function computeAggregates(sets: CreateSetDetail[]): {
  sets_completed: number;
  reps_completed: number;
  weight_used: number | null;
} {
  const sets_completed = sets.length;
  const reps_completed = sets.reduce((s, x) => s + x.reps, 0);
  const weights = sets.map((x) => x.weight).filter((w): w is number => w != null);
  const weight_used = weights.length ? Math.max(...weights) : null;
  return { sets_completed, reps_completed, weight_used };
}

async function buildExerciseResponse(row: SessionExerciseRow): Promise<SessionExercise> {
  const details = await all<SetDetailRow>(
    'SELECT * FROM set_details WHERE session_exercise_id = ? ORDER BY set_number',
    [row.id],
  );
  const sets: SetDetail[] = details.map((d) => ({
    id: d.id,
    set_number: d.set_number,
    reps: d.reps,
    weight: d.weight ?? null,
    set_type: d.set_type as SetType,
  }));
  return {
    id: row.id,
    exercise_name: row.exercise_name,
    sets_completed: row.sets_completed,
    reps_completed: row.reps_completed,
    weight_used: row.weight_used ?? null,
    one_rep_max: row.one_rep_max ?? null,
    order: row.order,
    sets,
  };
}

async function buildSession(sessionId: number): Promise<WorkoutSession> {
  const s = await one<SessionRow>('SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?', [
    sessionId,
    U,
  ]);
  if (!s) throw new Error('Session not found');
  const exRows = await all<SessionExerciseRow>(
    'SELECT * FROM session_exercises WHERE session_id = ? ORDER BY "order"',
    [sessionId],
  );
  const exercises = await Promise.all(exRows.map(buildExerciseResponse));
  return {
    id: s.id,
    date: s.workout_date.slice(0, 10),
    workout_day: s.workout_day,
    notes: s.notes ?? null,
    duration_minutes: s.duration_minutes ?? null,
    created_at: s.created_at,
    exercises,
  };
}

async function saveSetDetails(sessionExerciseId: number, sets: CreateSetDetail[]): Promise<void> {
  for (const s of sets) {
    await run(
      'INSERT INTO set_details (session_exercise_id, set_number, reps, weight, set_type) VALUES (?, ?, ?, ?, ?)',
      [sessionExerciseId, s.set_number, s.reps, s.weight ?? null, s.set_type ?? 'normal'],
    );
  }
}

async function upsertExercise(sessionId: number, ex: CreateSessionExercise): Promise<void> {
  let setsCompleted: number;
  let repsCompleted: number;
  let weightUsed: number | null;
  if (ex.sets && ex.sets.length) {
    ({ sets_completed: setsCompleted, reps_completed: repsCompleted, weight_used: weightUsed } =
      computeAggregates(ex.sets));
  } else {
    setsCompleted = ex.sets_completed ?? 0;
    repsCompleted = ex.reps_completed ?? 0;
    weightUsed = ex.weight_used ?? null;
  }

  const existing = await one<{ id: number }>(
    'SELECT id FROM session_exercises WHERE session_id = ? AND lower(exercise_name) = lower(?)',
    [sessionId, ex.exercise_name],
  );

  let sxId: number;
  if (existing) {
    sxId = existing.id;
    await run(
      'UPDATE session_exercises SET sets_completed = ?, reps_completed = ?, weight_used = ?, one_rep_max = ?, "order" = ? WHERE id = ?',
      [setsCompleted, repsCompleted, weightUsed, ex.one_rep_max ?? null, ex.order, sxId],
    );
    await run('DELETE FROM set_details WHERE session_exercise_id = ?', [sxId]);
  } else {
    const res = await run(
      'INSERT INTO session_exercises (session_id, exercise_name, sets_completed, reps_completed, weight_used, one_rep_max, "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, ex.exercise_name, setsCompleted, repsCompleted, weightUsed, ex.one_rep_max ?? null, ex.order],
    );
    sxId = res.lastId!;
  }

  if (ex.sets && ex.sets.length) await saveSetDetails(sxId, ex.sets);
}

/**
 * Auto-log an exercise stat change into today's session. Mirrors the old
 * backend's session_repository.auto_log_exercise: finds or creates today's
 * session for this workout_day, then upserts the exercise entry so repeated
 * edits update the same row instead of creating duplicates.
 */
export async function autoLogExercise(
  exerciseName: string,
  workoutDay: string,
  sets: number,
  reps: number,
  weight: number | null,
): Promise<void> {
  const today = todayISO();

  let session = await one<{ id: number }>(
    'SELECT id FROM workout_sessions WHERE user_id = ? AND workout_date = ? AND workout_day = ?',
    [U, today, workoutDay],
  );
  let sessionId: number;
  if (session) {
    sessionId = session.id;
  } else {
    const res = await run(
      'INSERT INTO workout_sessions (user_id, workout_date, workout_day) VALUES (?, ?, ?)',
      [U, today, workoutDay],
    );
    sessionId = res.lastId!;
  }

  const existing = await one<{ id: number }>(
    'SELECT id FROM session_exercises WHERE session_id = ? AND lower(exercise_name) = lower(?)',
    [sessionId, exerciseName],
  );

  if (existing) {
    await run(
      'UPDATE session_exercises SET sets_completed = ?, reps_completed = ?, weight_used = ? WHERE id = ?',
      [sets, reps, weight, existing.id],
    );
  } else {
    const countRow = await one<{ n: number }>(
      'SELECT COUNT(*) AS n FROM session_exercises WHERE session_id = ?',
      [sessionId],
    );
    await run(
      'INSERT INTO session_exercises (session_id, exercise_name, sets_completed, reps_completed, weight_used, "order") VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, exerciseName, sets, reps, weight, countRow?.n ?? 0],
    );
  }
}

// ---------- public API ----------

export async function createSession(data: CreateWorkoutSession): Promise<WorkoutSession> {
  // Merge into an existing session for the same date + workout_day.
  const existing = await one<{ id: number }>(
    'SELECT id FROM workout_sessions WHERE user_id = ? AND workout_date = ? AND workout_day = ?',
    [U, data.date, data.workout_day],
  );

  let sessionId: number;
  if (existing) {
    sessionId = existing.id;
    if (data.notes !== undefined && data.notes !== null) {
      await run('UPDATE workout_sessions SET notes = ? WHERE id = ?', [data.notes, sessionId]);
    }
    if (data.duration_minutes !== undefined && data.duration_minutes !== null) {
      await run('UPDATE workout_sessions SET duration_minutes = ? WHERE id = ?', [
        data.duration_minutes,
        sessionId,
      ]);
    }
  } else {
    const res = await run(
      'INSERT INTO workout_sessions (user_id, workout_date, workout_day, notes, duration_minutes) VALUES (?, ?, ?, ?, ?)',
      [U, data.date, data.workout_day, data.notes ?? null, data.duration_minutes ?? null],
    );
    sessionId = res.lastId!;
  }

  for (const ex of data.exercises) await upsertExercise(sessionId, ex);

  return buildSession(sessionId);
}

export async function getSession(sessionId: number): Promise<WorkoutSession> {
  return buildSession(sessionId);
}

export async function updateSession(sessionId: number, data: CreateWorkoutSession): Promise<WorkoutSession> {
  const s = await one<{ id: number }>('SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?', [
    sessionId,
    U,
  ]);
  if (!s) throw new Error('Session not found');

  await run(
    'UPDATE workout_sessions SET workout_date = ?, workout_day = ?, notes = ?, duration_minutes = ? WHERE id = ?',
    [data.date, data.workout_day, data.notes ?? null, data.duration_minutes ?? null, sessionId],
  );

  // Replace all exercises (and their set details).
  const oldEx = await all<{ id: number }>('SELECT id FROM session_exercises WHERE session_id = ?', [
    sessionId,
  ]);
  for (const ex of oldEx) {
    await run('DELETE FROM set_details WHERE session_exercise_id = ?', [ex.id]);
  }
  await run('DELETE FROM session_exercises WHERE session_id = ?', [sessionId]);

  for (const ex of data.exercises) {
    let setsCompleted: number;
    let repsCompleted: number;
    let weightUsed: number | null;
    if (ex.sets && ex.sets.length) {
      ({ sets_completed: setsCompleted, reps_completed: repsCompleted, weight_used: weightUsed } =
        computeAggregates(ex.sets));
    } else {
      setsCompleted = ex.sets_completed ?? 0;
      repsCompleted = ex.reps_completed ?? 0;
      weightUsed = ex.weight_used ?? null;
    }
    const res = await run(
      'INSERT INTO session_exercises (session_id, exercise_name, sets_completed, reps_completed, weight_used, one_rep_max, "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sessionId, ex.exercise_name, setsCompleted, repsCompleted, weightUsed, ex.one_rep_max ?? null, ex.order],
    );
    if (ex.sets && ex.sets.length) await saveSetDetails(res.lastId!, ex.sets);
  }

  return buildSession(sessionId);
}

export async function deleteSession(sessionId: number): Promise<void> {
  const s = await one<{ id: number }>('SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?', [
    sessionId,
    U,
  ]);
  if (!s) return;
  const exRows = await all<{ id: number }>('SELECT id FROM session_exercises WHERE session_id = ?', [
    sessionId,
  ]);
  for (const ex of exRows) {
    await run('DELETE FROM set_details WHERE session_exercise_id = ?', [ex.id]);
  }
  await run('DELETE FROM session_exercises WHERE session_id = ?', [sessionId]);
  await run('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

export async function getCalendarSessions(year: number, month: number): Promise<WorkoutSessionSummary[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endY = month === 12 ? year + 1 : year;
  const endM = month === 12 ? 1 : month + 1;
  const end = `${endY}-${String(endM).padStart(2, '0')}-01`;

  const rows = await all<{
    id: number;
    workout_date: string;
    workout_day: string;
    exercise_count: number;
    total_volume: number;
  }>(
    `SELECT ws.id AS id, ws.workout_date AS workout_date, ws.workout_day AS workout_day,
            COUNT(se.id) AS exercise_count,
            COALESCE(SUM(se.sets_completed * se.reps_completed * COALESCE(se.weight_used, 0)), 0) AS total_volume
     FROM workout_sessions ws
     LEFT JOIN session_exercises se ON se.session_id = ws.id
     WHERE ws.user_id = ? AND ws.workout_date >= ? AND ws.workout_date < ?
     GROUP BY ws.id, ws.workout_date, ws.workout_day
     ORDER BY ws.workout_date`,
    [U, start, end],
  );

  return rows.map((r) => ({
    id: r.id,
    date: r.workout_date.slice(0, 10),
    workout_day: r.workout_day,
    exercise_count: r.exercise_count,
    total_volume: Number(r.total_volume),
  }));
}

export async function getStreak(): Promise<StreakInfo> {
  const rows = await all<{ workout_date: string }>(
    'SELECT DISTINCT workout_date FROM workout_sessions WHERE user_id = ? ORDER BY workout_date',
    [U],
  );
  const dates = rows.map((r) => r.workout_date.slice(0, 10));
  const total = dates.length;
  if (total === 0) {
    return { weekly_trend: [], this_week: 0, total_workouts: 0, last_workout_date: null };
  }

  const lastWorkoutDate = dates[dates.length - 1];
  const dateSet = new Set(dates);

  const todayMs = parseISO(todayISO());
  const dow = new Date(todayMs).getUTCDay(); // 0 = Sunday
  const currentWeekStart = addDays(todayMs, -dow);

  const weekly_trend: WeekSummary[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      if (dateSet.has(toISODate(addDays(weekStart, d)))) count++;
    }
    weekly_trend.push({ week_start: toISODate(weekStart), workouts: count });
  }

  return {
    weekly_trend,
    this_week: weekly_trend.length ? weekly_trend[weekly_trend.length - 1].workouts : 0,
    total_workouts: total,
    last_workout_date: lastWorkoutDate,
  };
}

type Metric = 'weight' | 'volume' | 'one_rep_max';

async function progressPoints(exerciseName: string, metric: Metric): Promise<ProgressPoint[]> {
  const rows = await all<{ workout_date: string } & SessionExerciseRow>(
    `SELECT ws.workout_date AS workout_date, se.*
     FROM workout_sessions ws
     JOIN session_exercises se ON se.session_id = ws.id
     WHERE ws.user_id = ? AND lower(se.exercise_name) = lower(?)
     ORDER BY ws.workout_date`,
    [U, exerciseName],
  );

  const byDate = new Map<string, SessionExerciseRow[]>();
  for (const r of rows) {
    const d = r.workout_date.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }

  const points: ProgressPoint[] = [];
  for (const d of [...byDate.keys()].sort()) {
    const exs = byDate.get(d)!;
    let value = 0;
    if (metric === 'weight') {
      value = Math.max(...exs.map((e) => e.weight_used ?? 0));
    } else if (metric === 'volume') {
      value = exs.reduce((s, e) => s + e.sets_completed * e.reps_completed * (e.weight_used ?? 0), 0);
    } else {
      value = Math.max(...exs.map((e) => e.one_rep_max ?? 0));
    }
    if (value > 0) points.push({ date: d, value });
  }
  return points;
}

export async function getExerciseProgressData(
  exerciseName: string,
  metric: Metric = 'weight',
): Promise<ExerciseProgress> {
  const data = await progressPoints(exerciseName, metric);
  return { exercise_name: exerciseName, metric, data };
}

export async function getExerciseProgressBatch(
  exerciseNames: string[],
  metric: Metric = 'weight',
): Promise<{ metric: string; exercises: Record<string, { date: string; value: number }[]> }> {
  const exercises: Record<string, { date: string; value: number }[]> = {};
  for (const name of exerciseNames) {
    exercises[name] = await progressPoints(name, metric);
  }
  return { metric, exercises };
}

/** Recent sessions with derived volume, newest-last — used by the AI context. */
export async function getRecentSessions(limit = 60): Promise<
  { date: string; workout_day: string; exercise_count: number; total_volume: number }[]
> {
  const rows = await all<{
    workout_date: string;
    workout_day: string;
    exercise_count: number;
    total_volume: number;
  }>(
    `SELECT ws.workout_date AS workout_date, ws.workout_day AS workout_day,
            COUNT(se.id) AS exercise_count,
            COALESCE(SUM(se.sets_completed * se.reps_completed * COALESCE(se.weight_used, 0)), 0) AS total_volume
     FROM workout_sessions ws
     LEFT JOIN session_exercises se ON se.session_id = ws.id
     WHERE ws.user_id = ?
     GROUP BY ws.id, ws.workout_date, ws.workout_day
     ORDER BY ws.workout_date
     LIMIT ?`,
    [U, limit],
  );
  return rows.map((r) => ({
    date: r.workout_date.slice(0, 10),
    workout_day: r.workout_day,
    exercise_count: r.exercise_count,
    total_volume: Number(r.total_volume),
  }));
}
