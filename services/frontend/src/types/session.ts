/**
 * Workout session type definitions matching the FastAPI backend models.
 */

export type SetType = 'normal' | 'warm_up' | 'drop_set' | 'amrap' | 'failure';

export interface SetDetail {
  id: number;
  set_number: number;
  reps: number;
  weight: number | null;
  set_type: SetType;
}

export interface CreateSetDetail {
  set_number: number;
  reps: number;
  weight?: number | null;
  set_type?: SetType;
}

export interface SessionExercise {
  id: number;
  exercise_name: string;
  sets_completed: number;
  reps_completed: number;
  weight_used: number | null;
  one_rep_max: number | null;
  order: number;
  sets: SetDetail[];
}

export interface CreateSessionExercise {
  exercise_name: string;
  sets_completed?: number;
  reps_completed?: number;
  weight_used?: number | null;
  one_rep_max?: number | null;
  order: number;
  sets?: CreateSetDetail[];
}

export interface WorkoutSession {
  id: number;
  date: string;
  workout_day: string;
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  exercises: SessionExercise[];
}

export interface CreateWorkoutSession {
  date: string;
  workout_day: string;
  notes?: string | null;
  duration_minutes?: number | null;
  exercises: CreateSessionExercise[];
}

export interface WorkoutSessionSummary {
  id: number;
  date: string;
  workout_day: string;
  exercise_count: number;
  total_volume: number;
}

export interface WeekSummary {
  week_start: string;
  workouts: number;
}

export interface StreakInfo {
  weekly_trend: WeekSummary[];
  this_week: number;
  total_workouts: number;
  last_workout_date: string | null;
}

export interface ProgressPoint {
  date: string;
  value: number;
}

export interface ExerciseProgress {
  exercise_name: string;
  metric: string;
  data: ProgressPoint[];
}
