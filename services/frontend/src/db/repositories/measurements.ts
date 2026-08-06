/**
 * Body measurement repository — on-device port of
 * services/api/src/database/measurement_repository.py.
 */

import type {
  BodyMeasurement,
  CreateBodyMeasurement,
  MeasurementProgress,
  MeasurementProgressPoint,
  MeasurementMetric,
} from '../../types/measurement';
import { all, one, run } from '../database';
import { LOCAL_USER_ID } from '../schema';

const U = LOCAL_USER_ID;

// metric -> [db column, display unit]
const METRIC_MAP: Record<string, [string, string]> = {
  weight: ['weight_kg', 'kg'],
  body_fat: ['body_fat_pct', '%'],
  chest: ['chest_cm', 'cm'],
  waist: ['waist_cm', 'cm'],
  hips: ['hips_cm', 'cm'],
  bicep_left: ['bicep_left_cm', 'cm'],
  bicep_right: ['bicep_right_cm', 'cm'],
  thigh_left: ['thigh_left_cm', 'cm'],
  thigh_right: ['thigh_right_cm', 'cm'],
  neck: ['neck_cm', 'cm'],
  shoulders: ['shoulders_cm', 'cm'],
  forearm: ['forearm_cm', 'cm'],
  calf: ['calf_cm', 'cm'],
};

const COLUMNS = [
  'weight_kg',
  'body_fat_pct',
  'chest_cm',
  'waist_cm',
  'hips_cm',
  'bicep_left_cm',
  'bicep_right_cm',
  'thigh_left_cm',
  'thigh_right_cm',
  'neck_cm',
  'shoulders_cm',
  'forearm_cm',
  'calf_cm',
] as const;

interface MeasurementRow {
  id: number;
  measurement_date: string;
  notes: string | null;
  created_at: string;
  [k: string]: unknown;
}

function mapMeasurement(r: MeasurementRow): BodyMeasurement {
  const num = (k: string) => (r[k] == null ? null : Number(r[k]));
  return {
    id: r.id,
    date: r.measurement_date.slice(0, 10),
    weight_kg: num('weight_kg'),
    body_fat_pct: num('body_fat_pct'),
    chest_cm: num('chest_cm'),
    waist_cm: num('waist_cm'),
    hips_cm: num('hips_cm'),
    bicep_left_cm: num('bicep_left_cm'),
    bicep_right_cm: num('bicep_right_cm'),
    thigh_left_cm: num('thigh_left_cm'),
    thigh_right_cm: num('thigh_right_cm'),
    neck_cm: num('neck_cm'),
    shoulders_cm: num('shoulders_cm'),
    forearm_cm: num('forearm_cm'),
    calf_cm: num('calf_cm'),
    notes: r.notes ?? null,
    created_at: r.created_at,
  };
}

export async function createMeasurement(data: CreateBodyMeasurement): Promise<BodyMeasurement> {
  const cols = ['user_id', 'measurement_date', ...COLUMNS, 'notes'];
  const vals: unknown[] = [
    U,
    data.date,
    ...COLUMNS.map((c) => (data as unknown as Record<string, unknown>)[c] ?? null),
    data.notes ?? null,
  ];
  const placeholders = cols.map(() => '?').join(', ');
  const res = await run(`INSERT INTO body_measurements (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  return getMeasurement(res.lastId!);
}

async function getMeasurement(id: number): Promise<BodyMeasurement> {
  const row = await one<MeasurementRow>('SELECT * FROM body_measurements WHERE id = ? AND user_id = ?', [
    id,
    U,
  ]);
  if (!row) throw new Error('Measurement not found');
  return mapMeasurement(row);
}

export async function listMeasurements(): Promise<BodyMeasurement[]> {
  const rows = await all<MeasurementRow>(
    'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY measurement_date DESC',
    [U],
  );
  return rows.map(mapMeasurement);
}

export async function getLatestMeasurement(): Promise<BodyMeasurement> {
  const row = await one<MeasurementRow>(
    'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY measurement_date DESC LIMIT 1',
    [U],
  );
  if (!row) throw new Error('No measurements yet');
  return mapMeasurement(row);
}

export async function updateMeasurement(id: number, data: CreateBodyMeasurement): Promise<BodyMeasurement> {
  const existing = await one<{ id: number }>(
    'SELECT id FROM body_measurements WHERE id = ? AND user_id = ?',
    [id, U],
  );
  if (!existing) throw new Error('Measurement not found');

  const setCols = ['measurement_date', ...COLUMNS, 'notes'];
  const vals: unknown[] = [
    data.date,
    ...COLUMNS.map((c) => (data as unknown as Record<string, unknown>)[c] ?? null),
    data.notes ?? null,
    id,
    U,
  ];
  await run(
    `UPDATE body_measurements SET ${setCols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
    vals,
  );
  return getMeasurement(id);
}

export async function deleteMeasurement(id: number): Promise<void> {
  await run('DELETE FROM body_measurements WHERE id = ? AND user_id = ?', [id, U]);
}

export async function getMeasurementProgress(metric: MeasurementMetric): Promise<MeasurementProgress> {
  const info = METRIC_MAP[metric];
  if (!info) return { metric, unit: '', data: [] };
  const [column, unit] = info;

  const rows = await all<MeasurementRow>(
    'SELECT * FROM body_measurements WHERE user_id = ? ORDER BY measurement_date',
    [U],
  );
  const data: MeasurementProgressPoint[] = [];
  for (const r of rows) {
    const value = r[column];
    if (value != null) data.push({ date: r.measurement_date.slice(0, 10), value: Number(value) });
  }
  return { metric, unit, data };
}
