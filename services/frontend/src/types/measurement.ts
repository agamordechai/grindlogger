/**
 * Body measurement type definitions matching the FastAPI backend models.
 */

export interface BodyMeasurement {
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
  created_at: string;
}

export interface CreateBodyMeasurement {
  date: string;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  bicep_left_cm?: number | null;
  bicep_right_cm?: number | null;
  thigh_left_cm?: number | null;
  thigh_right_cm?: number | null;
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  forearm_cm?: number | null;
  calf_cm?: number | null;
  notes?: string | null;
}

export interface MeasurementProgressPoint {
  date: string;
  value: number;
}

export interface MeasurementProgress {
  metric: string;
  unit: string;
  data: MeasurementProgressPoint[];
}

export type MeasurementMetric =
  | 'weight'
  | 'body_fat'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'bicep_left'
  | 'bicep_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'neck'
  | 'shoulders'
  | 'forearm'
  | 'calf';

export const MEASUREMENT_METRICS: { value: MeasurementMetric; label: string; field: keyof BodyMeasurement }[] = [
  { value: 'weight', label: 'Weight', field: 'weight_kg' },
  { value: 'body_fat', label: 'Body Fat %', field: 'body_fat_pct' },
  { value: 'chest', label: 'Chest', field: 'chest_cm' },
  { value: 'waist', label: 'Waist', field: 'waist_cm' },
  { value: 'hips', label: 'Hips', field: 'hips_cm' },
  { value: 'shoulders', label: 'Shoulders', field: 'shoulders_cm' },
  { value: 'neck', label: 'Neck', field: 'neck_cm' },
  { value: 'bicep_left', label: 'Bicep (L)', field: 'bicep_left_cm' },
  { value: 'bicep_right', label: 'Bicep (R)', field: 'bicep_right_cm' },
  { value: 'forearm', label: 'Forearm', field: 'forearm_cm' },
  { value: 'thigh_left', label: 'Thigh (L)', field: 'thigh_left_cm' },
  { value: 'thigh_right', label: 'Thigh (R)', field: 'thigh_right_cm' },
  { value: 'calf', label: 'Calf', field: 'calf_cm' },
];
