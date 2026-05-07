/**
 * Exercise type definitions matching the FastAPI backend models.
 */

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
  notes: string | null;
  archived: boolean;
  sort_order: number;
  superset_group: number | null;
  per_side: boolean;
}

export interface ExerciseNameStatus {
  name: string;
  status: 'active' | 'archived';
}

export interface ArchivedExerciseSuggestion {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  workout_day: string;
}

export interface CreateExerciseRequest {
  name: string;
  sets: number;
  reps: number;
  weight?: number | null;
  workout_day?: string;
  per_side?: boolean;
}

export interface UpdateExerciseRequest {
  name?: string;
  sets?: number;
  reps?: number;
  weight?: number | null;
  workout_day?: string;
  notes?: string | null;
  per_side?: boolean;
}

export interface PaginatedExerciseResponse {
  page: number;
  page_size: number;
  total: number;
  items: Exercise[];
}

export type FilterType = 'All' | 'Weighted Only' | 'Bodyweight Only';

