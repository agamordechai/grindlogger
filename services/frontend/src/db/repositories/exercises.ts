/**
 * Exercise repository — on-device port of
 * services/api/src/database/sqlmodel_repository.py.
 * All rows scoped to LOCAL_USER_ID.
 */

import type {
  Exercise,
  CreateExerciseRequest,
  UpdateExerciseRequest,
  PaginatedExerciseResponse,
  ExerciseNameStatus,
  ArchivedExerciseSuggestion,
} from '../../types/exercise';
import { all, one, run, tx, toBool } from '../database';
import { LOCAL_USER_ID } from '../schema';

const U = LOCAL_USER_ID;

interface ExerciseRow {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
  notes: string | null;
  archived: number;
  sort_order: number;
  superset_group: number | null;
  per_side: number;
}

function mapExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    name: r.name,
    sets: r.sets,
    reps: r.reps,
    weight: r.weight ?? null,
    workout_day: r.workout_day,
    notes: r.notes ?? null,
    archived: toBool(r.archived),
    sort_order: r.sort_order,
    superset_group: r.superset_group ?? null,
    per_side: toBool(r.per_side),
  };
}

const SORTABLE = new Set(['id', 'name', 'sets', 'reps', 'weight', 'workout_day', 'sort_order']);

export async function listExercises(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<PaginatedExerciseResponse> {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, params?.page_size ?? 20);
  const sortBy = SORTABLE.has(params?.sort_by ?? '') ? (params!.sort_by as string) : 'id';
  const dir = (params?.sort_order ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const totalRow = await one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM exercises WHERE user_id = ? AND archived = 0',
    [U],
  );
  const total = totalRow?.n ?? 0;

  const orderClause =
    sortBy === 'sort_order' ? 'ORDER BY sort_order ASC, id ASC' : `ORDER BY ${sortBy} ${dir}`;

  const rows = await all<ExerciseRow>(
    `SELECT * FROM exercises WHERE user_id = ? AND archived = 0 ${orderClause} LIMIT ? OFFSET ?`,
    [U, pageSize, (page - 1) * pageSize],
  );

  return { page, page_size: pageSize, total, items: rows.map(mapExercise) };
}

/** All active exercises (used by the AI workout-context builder). */
export async function getAllActiveExercises(): Promise<Exercise[]> {
  const rows = await all<ExerciseRow>(
    'SELECT * FROM exercises WHERE user_id = ? AND archived = 0 ORDER BY sort_order ASC, id ASC',
    [U],
  );
  return rows.map(mapExercise);
}

export async function getExercise(id: number): Promise<Exercise> {
  const row = await one<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ? AND user_id = ? AND archived = 0',
    [id, U],
  );
  if (!row) throw new Error('Exercise not found');
  return mapExercise(row);
}

export async function createExercise(data: CreateExerciseRequest): Promise<Exercise> {
  const res = await run(
    `INSERT INTO exercises (name, sets, reps, weight, workout_day, user_id, per_side)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.sets,
      data.reps,
      data.weight ?? null,
      data.workout_day ?? 'A',
      U,
      data.per_side ? 1 : 0,
    ],
  );
  return getExercise(res.lastId!);
}

export async function updateExercise(id: number, data: UpdateExerciseRequest): Promise<Exercise> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  const push = (col: string, v: unknown) => {
    sets.push(`${col} = ?`);
    vals.push(v);
  };
  if (data.name !== undefined) push('name', data.name);
  if (data.sets !== undefined) push('sets', data.sets);
  if (data.reps !== undefined) push('reps', data.reps);
  if ('weight' in data) push('weight', data.weight ?? null);
  if (data.workout_day !== undefined) push('workout_day', data.workout_day);
  if ('notes' in data) push('notes', data.notes ?? null);
  if (data.per_side !== undefined) push('per_side', data.per_side ? 1 : 0);

  if (sets.length) {
    vals.push(id, U);
    await run(`UPDATE exercises SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, vals);
  }
  // Return whatever exists (may be archived if it was); match server which
  // fetches by id without the archived filter after update.
  const row = await one<ExerciseRow>('SELECT * FROM exercises WHERE id = ? AND user_id = ?', [id, U]);
  if (!row) throw new Error('Exercise not found');
  return mapExercise(row);
}

export async function deleteExercise(id: number): Promise<void> {
  await run('DELETE FROM exercises WHERE id = ? AND user_id = ? AND archived = 0', [id, U]);
}

export async function clearExercises(): Promise<{ deleted: number }> {
  const res = await run('DELETE FROM exercises WHERE user_id = ? AND archived = 0', [U]);
  return { deleted: res.changes };
}

export async function reorderExercises(items: { id: number; sort_order: number }[]): Promise<void> {
  await tx(async (db) => {
    for (const it of items) {
      await db.run('UPDATE exercises SET sort_order = ? WHERE id = ? AND user_id = ?', [
        it.sort_order,
        it.id,
        U,
      ]);
    }
  });
}

export async function createSuperset(exerciseIds: number[]): Promise<{ superset_group: number }> {
  const maxRow = await one<{ m: number | null }>(
    'SELECT MAX(superset_group) AS m FROM exercises WHERE user_id = ?',
    [U],
  );
  const groupId = (maxRow?.m ?? 0) + 1;
  await tx(async (db) => {
    for (const id of exerciseIds) {
      await db.run('UPDATE exercises SET superset_group = ? WHERE id = ? AND user_id = ?', [
        groupId,
        id,
        U,
      ]);
    }
  });
  return { superset_group: groupId };
}

export async function removeSuperset(exerciseIds: number[]): Promise<void> {
  // Collect the groups these exercises currently belong to.
  const oldGroups = new Set<number>();
  for (const id of exerciseIds) {
    const row = await one<{ superset_group: number | null }>(
      'SELECT superset_group FROM exercises WHERE id = ? AND user_id = ?',
      [id, U],
    );
    if (row?.superset_group != null) oldGroups.add(row.superset_group);
  }

  await tx(async (db) => {
    for (const id of exerciseIds) {
      await db.run('UPDATE exercises SET superset_group = NULL WHERE id = ? AND user_id = ?', [id, U]);
    }
  });

  // Auto-unlink any old group left with a single member.
  for (const gid of oldGroups) {
    const remaining = await all<{ id: number }>(
      'SELECT id FROM exercises WHERE user_id = ? AND superset_group = ?',
      [U, gid],
    );
    if (remaining.length === 1) {
      await run('UPDATE exercises SET superset_group = NULL WHERE id = ? AND user_id = ?', [
        remaining[0].id,
        U,
      ]);
    }
  }
}

export async function archiveExercise(id: number): Promise<void> {
  await run('UPDATE exercises SET archived = 1 WHERE id = ? AND user_id = ? AND archived = 0', [id, U]);
}

export async function restoreExercise(id: number, workout_day?: string): Promise<Exercise> {
  const ex = await one<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ? AND user_id = ? AND archived = 1',
    [id, U],
  );
  if (!ex) throw new Error('Archived exercise not found');
  const targetDay = workout_day !== undefined ? workout_day : ex.workout_day;

  // Delete active duplicates with the same name + target day.
  await run(
    'DELETE FROM exercises WHERE user_id = ? AND archived = 0 AND lower(name) = lower(?) AND workout_day = ?',
    [U, ex.name, targetDay],
  );
  await run('UPDATE exercises SET workout_day = ?, archived = 0 WHERE id = ? AND user_id = ?', [
    targetDay,
    id,
    U,
  ]);
  const row = await one<ExerciseRow>('SELECT * FROM exercises WHERE id = ? AND user_id = ?', [id, U]);
  return mapExercise(row!);
}

export async function listArchivedExercises(): Promise<Exercise[]> {
  const rows = await all<ExerciseRow>('SELECT * FROM exercises WHERE user_id = ? AND archived = 1', [U]);
  return rows.map(mapExercise);
}

export async function permanentDeleteExercise(id: number): Promise<void> {
  await run('DELETE FROM exercises WHERE id = ? AND user_id = ? AND archived = 1', [id, U]);
}

export async function searchArchivedExercises(query: string): Promise<ArchivedExerciseSuggestion[]> {
  const rows = await all<ExerciseRow>(
    'SELECT * FROM exercises WHERE user_id = ? AND archived = 1 AND lower(name) LIKE ?',
    [U, `%${query.toLowerCase()}%`],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sets: r.sets,
    reps: r.reps,
    weight: r.weight ?? null,
    workout_day: r.workout_day,
    per_side: toBool(r.per_side),
  }));
}

export async function getExerciseNames(): Promise<ExerciseNameStatus[]> {
  const rows = await all<ExerciseRow>('SELECT name, archived FROM exercises WHERE user_id = ?', [U]);
  const nameMap = new Map<string, 'active' | 'archived'>();
  const order: string[] = [];
  for (const r of rows) {
    const lower = r.name.toLowerCase();
    const active = !toBool(r.archived);
    if (!nameMap.has(lower)) order.push(lower);
    if (!nameMap.has(lower) || active) {
      nameMap.set(lower, active ? 'active' : 'archived');
    }
  }
  return order.map((n) => ({ name: n, status: nameMap.get(n)! }));
}

/** Seed presets — verbatim from sqlmodel_repository.seed_initial_data. */
type SeedEx = { name: string; sets: number; reps: number; weight: number | null; workout_day: string };

const DAILY: SeedEx[] = [
  { name: 'Crunches', sets: 1, reps: 30, weight: null, workout_day: 'None' },
  { name: 'Penguins', sets: 1, reps: 25, weight: null, workout_day: 'None' },
  { name: 'Leg drops', sets: 1, reps: 25, weight: null, workout_day: 'None' },
  { name: 'Plank', sets: 1, reps: 90, weight: null, workout_day: 'None' },
  { name: 'Running', sets: 1, reps: 30, weight: null, workout_day: 'None' },
];

const FULLBODY: SeedEx[] = [
  { name: 'Squats', sets: 3, reps: 8, weight: 80.0, workout_day: 'A' },
  { name: 'Bench Press', sets: 3, reps: 8, weight: 80.0, workout_day: 'A' },
  { name: 'Bent Over Row', sets: 3, reps: 8, weight: 70.0, workout_day: 'A' },
  { name: 'Overhead Press', sets: 3, reps: 8, weight: 50.0, workout_day: 'A' },
  { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: 80.0, workout_day: 'A' },
  { name: 'Pull ups', sets: 3, reps: 8, weight: null, workout_day: 'A' },
  { name: 'Bicep Curl', sets: 3, reps: 12, weight: 20.0, workout_day: 'A' },
  { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 25.0, workout_day: 'A' },
];

const AB: SeedEx[] = [
  { name: 'Bench Press', sets: 3, reps: 8, weight: 80.0, workout_day: 'A' },
  { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 25.0, workout_day: 'A' },
  { name: 'Cable Row', sets: 3, reps: 10, weight: 70.0, workout_day: 'A' },
  { name: 'Pull ups', sets: 3, reps: 8, weight: null, workout_day: 'A' },
  { name: 'Shoulder Press', sets: 3, reps: 10, weight: 40.0, workout_day: 'A' },
  { name: 'Bicep Curl', sets: 3, reps: 12, weight: 20.0, workout_day: 'A' },
  { name: 'Tricep Extension', sets: 3, reps: 12, weight: 25.0, workout_day: 'A' },
  { name: 'Squats', sets: 4, reps: 6, weight: 100.0, workout_day: 'B' },
  { name: 'Romanian Deadlift', sets: 3, reps: 8, weight: 90.0, workout_day: 'B' },
  { name: 'Leg Press', sets: 3, reps: 12, weight: 150.0, workout_day: 'B' },
  { name: 'Hip Thrust', sets: 3, reps: 10, weight: 90.0, workout_day: 'B' },
  { name: 'Leg Curl', sets: 3, reps: 12, weight: 70.0, workout_day: 'B' },
  { name: 'Calf Raises', sets: 4, reps: 15, weight: 60.0, workout_day: 'B' },
];

const PPL: SeedEx[] = [
  { name: 'Bench Press', sets: 3, reps: 10, weight: 100.0, workout_day: 'A' },
  { name: 'Shoulder Press', sets: 3, reps: 10, weight: 22.5, workout_day: 'A' },
  { name: 'Tricep Extension', sets: 3, reps: 10, weight: 42.5, workout_day: 'A' },
  { name: 'Incline Bench Press', sets: 3, reps: 10, weight: 37.5, workout_day: 'A' },
  { name: 'Chest Fly', sets: 3, reps: 10, weight: 20.0, workout_day: 'A' },
  { name: 'Upper Chest Fly', sets: 3, reps: 10, weight: 20.0, workout_day: 'A' },
  { name: 'Shoulder Extension', sets: 5, reps: 8, weight: 12.5, workout_day: 'A' },
  { name: 'Overhead Tricep Extension', sets: 3, reps: 8, weight: 17.5, workout_day: 'A' },
  { name: 'Pull ups', sets: 5, reps: 8, weight: null, workout_day: 'B' },
  { name: 'Cable Row', sets: 3, reps: 12, weight: 80.0, workout_day: 'B' },
  { name: 'Pull Over', sets: 3, reps: 10, weight: 45.0, workout_day: 'B' },
  { name: 'Dumbbell Shrugs', sets: 3, reps: 12, weight: 35.0, workout_day: 'B' },
  { name: 'Rear Delt', sets: 3, reps: 10, weight: 10.0, workout_day: 'B' },
  { name: 'Bicep Curl', sets: 3, reps: 10, weight: 35.0, workout_day: 'B' },
  { name: 'Bicep Hammer Curls', sets: 3, reps: 8, weight: 25.0, workout_day: 'B' },
  { name: 'Squats', sets: 3, reps: 8, weight: 95.0, workout_day: 'C' },
  { name: 'Hip Thrust', sets: 3, reps: 10, weight: 100.0, workout_day: 'C' },
  { name: 'Bulgarian Split Squat', sets: 3, reps: 8, weight: 27.5, workout_day: 'C' },
  { name: 'Hip Adduction', sets: 3, reps: 16, weight: 90.0, workout_day: 'C' },
  { name: 'Hip Abduction', sets: 3, reps: 16, weight: 90.0, workout_day: 'C' },
  { name: 'Knee Extension', sets: 3, reps: 10, weight: 164.0, workout_day: 'C' },
  { name: 'Knee Flexion', sets: 3, reps: 10, weight: 90.0, workout_day: 'C' },
];

export async function seedExercises(split: 'ppl' | 'ab' | 'fullbody' = 'ppl'): Promise<{ seeded: number }> {
  const existing = await one<{ id: number }>(
    'SELECT id FROM exercises WHERE user_id = ? AND archived = 0 LIMIT 1',
    [U],
  );
  if (existing) return { seeded: 0 };

  const splitEx = split === 'fullbody' ? FULLBODY : split === 'ab' ? AB : PPL;
  const seed = [...splitEx, ...DAILY];

  await tx(async (db) => {
    for (const ex of seed) {
      await db.run(
        'INSERT INTO exercises (name, sets, reps, weight, workout_day, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [ex.name, ex.sets, ex.reps, ex.weight, ex.workout_day, U],
      );
    }
  });
  return { seeded: seed.length };
}
