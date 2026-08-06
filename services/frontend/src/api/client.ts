/**
 * Local, on-device API facade for GrindLogger.
 *
 * Preserves the exact public surface the app has always imported, but every
 * function now reads/writes the on-device SQLite database (src/db) or calls the
 * AI provider directly (src/ai) instead of talking to the FastAPI backend.
 * The React UI is unchanged — it still imports these same names.
 */

import type { CreateExerciseRequest } from '../types/exercise';
import type { AuthTokens } from '../types/auth';
import type { AdminUser, AdminStats } from '../types/admin';
import type { AICoachHealthResponse } from '../types/aiCoach';

import { getAllActiveExercises, createExercise as localCreateExercise } from '../db/repositories/exercises';
import { getCurrentUser as localGetCurrentUser } from '../db/repositories/user';
import * as credentials from '../ai/credentials';

// ---------- Exercises / Sessions / Measurements (pure local re-exports) ----------

export type { AIProviderStatus } from '../ai/credentials';

export interface ExerciseListParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

export {
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  clearExercises,
  reorderExercises,
  createSuperset,
  removeSuperset,
  seedExercises,
  archiveExercise,
  restoreExercise,
  listArchivedExercises,
  permanentDeleteExercise,
  searchArchivedExercises,
  getExerciseNames,
} from '../db/repositories/exercises';

export {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getCalendarSessions,
  getStreak,
  getExerciseProgressData,
  getExerciseProgressBatch,
} from '../db/repositories/sessions';

export {
  createMeasurement,
  listMeasurements,
  getLatestMeasurement,
  getMeasurementProgress,
  updateMeasurement,
  deleteMeasurement,
} from '../db/repositories/measurements';

export {
  getCurrentUser,
  updateProfile,
  deleteAccount,
} from '../db/repositories/user';

/** Export all active exercises as a CSV download (was a server endpoint). */
export async function exportExercisesCSV(): Promise<void> {
  const exercises = await getAllActiveExercises();
  const header = ['name', 'sets', 'reps', 'weight', 'workout_day', 'per_side', 'notes'];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = exercises.map((e) =>
    [e.name, e.sets, e.reps, e.weight ?? '', e.workout_day, e.per_side, e.notes ?? '']
      .map(escape)
      .join(','),
  );
  const csv = [header.join(','), ...rows].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exercises.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Auth: social/email logins are not applicable offline ----------

const OFFLINE = 'This is a personal offline app — external login is not used.';
export async function googleLogin(_idToken: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}
export async function githubLogin(_code: string, _redirectUri: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}
export async function discordLogin(_code: string, _redirectUri: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}
export async function redditLogin(_code: string, _redirectUri: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}
export async function registerEmail(_e: string, _n: string, _p: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}
export async function loginEmail(_e: string, _p: string): Promise<AuthTokens> {
  throw new Error(OFFLINE);
}

// ---------- AI provider credentials (local) ----------

export async function getAIProviderStatus(): Promise<credentials.AIProviderStatus> {
  return credentials.getStatus();
}
export async function saveAIProvider(data: {
  api_key: string;
  base_url?: string | null;
  model?: string | null;
}): Promise<credentials.AIProviderStatus> {
  return credentials.saveProvider(data);
}
export async function deleteAIProvider(): Promise<void> {
  return credentials.deleteProvider();
}

// ---------- Google Calendar sync (remapped to native calendar in Phase 4) ----------

interface CalendarSyncStatus {
  connected: boolean;
  enabled: boolean;
  calendar_id: string | null;
}
interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
}
export async function getCalendarSyncStatus(): Promise<CalendarSyncStatus> {
  return { connected: false, enabled: false, calendar_id: null };
}
export async function connectGoogleCalendar(_c: string, _r: string): Promise<CalendarSyncStatus> {
  throw new Error('Calendar integration is set up on-device in Settings.');
}
export async function disconnectGoogleCalendar(): Promise<void> {
  /* no-op */
}
export async function getGoogleCalendars(): Promise<CalendarOption[]> {
  return [];
}
export async function updateCalendarSyncSettings(
  calendarId: string | null,
  enabled: boolean | null,
): Promise<CalendarSyncStatus> {
  return { connected: false, enabled: !!enabled, calendar_id: calendarId };
}

// ---------- Admin (single local user) ----------

export async function getAdminUsers(): Promise<AdminUser[]> {
  const u = await localGetCurrentUser();
  const exercises = await getAllActiveExercises();
  return [
    {
      id: u.id,
      email: u.email,
      name: u.name,
      picture_url: u.picture_url,
      role: u.role,
      disabled: false,
      created_at: new Date().toISOString(),
      exercise_count: exercises.length,
    },
  ];
}
export async function getAdminStats(): Promise<AdminStats> {
  const exercises = await getAllActiveExercises();
  return {
    total_users: 1,
    total_exercises: exercises.length,
    recent_signups_7d: 0,
    active_users_7d: 1,
  };
}
export async function updateAdminUser(_id: number, _data: { role?: string; disabled?: boolean }): Promise<AdminUser> {
  const [u] = await getAdminUsers();
  return u;
}
export async function deleteAdminUser(_id: number): Promise<void> {
  /* no-op — single local user */
}

// ---------- AI Coach (Anthropic, on-device) ----------

export async function getAICoachHealth(): Promise<AICoachHealthResponse> {
  const status = await credentials.getStatus();
  return {
    status: status.has_key ? 'healthy' : 'degraded',
    service: 'ai-coach (on-device)',
    ai_model: status.model ?? credentials.DEFAULT_MODEL,
    workout_api_connected: true,
    redis_connected: false,
  };
}

export {
  chatWithCoach,
  getWorkoutRecommendation,
  getProgressAnalysis,
  getOverloadSuggestions,
} from '../ai/coach';

// ---------- Chat history (local conversations) ----------

export {
  listConversations,
  getConversation,
  saveConversation,
  deleteConversation,
} from '../db/repositories/conversations';

// ---------- Utilities (unchanged) ----------

function parseReps(reps: string): number {
  const match = reps.match(/\d+/);
  return match ? parseInt(match[0], 10) : 10;
}

function parseWeight(weightSuggestion: string | undefined): number | null {
  if (!weightSuggestion) return null;
  const lower = weightSuggestion.toLowerCase();
  if (lower.includes('bodyweight') || lower.includes('bw') || lower === '-') return null;
  const match = weightSuggestion.match(/[\d.]+/);
  if (!match) return null;
  const val = parseFloat(match[0]);
  if (lower.includes('lb') || lower.includes('pound')) return Math.round(val * 0.453592 * 10) / 10;
  return val;
}

export interface ExerciseToImport {
  name: string;
  sets: number;
  reps: string;
  weight_suggestion?: string;
  workout_day: string;
}

export async function appendExercisesToRoutine(exercises: ExerciseToImport[]): Promise<void> {
  for (const ex of exercises) {
    const payload: CreateExerciseRequest = {
      name: ex.name,
      sets: ex.sets,
      reps: parseReps(ex.reps),
      weight: parseWeight(ex.weight_suggestion),
      workout_day: ex.workout_day,
    };
    await localCreateExercise(payload);
  }
}
