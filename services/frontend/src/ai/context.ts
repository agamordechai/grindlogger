/**
 * Workout-context builder for the on-device AI coach.
 *
 * Ports services/ai_coach/src/workout_client.py (context assembly + muscle-group
 * identification) and the _format_workout_context / _format_gap_analysis helpers
 * from agent.py. Reads straight from the local repositories.
 */

import type { Exercise } from '../types/exercise';
import { getAllActiveExercises } from '../db/repositories/exercises';
import { getCalendarSessions, getExerciseProgressBatch } from '../db/repositories/sessions';
import { getCycleLength } from '../db/repositories/user';

export interface RecentSession {
  date: string;
  workout_day: string;
  exercise_count: number;
  total_volume: number;
}

export interface WorkoutContextData {
  exercises: Exercise[];
  total_volume: number;
  exercise_count: number;
  muscle_groups_worked: string[];
  recent_sessions: RecentSession[];
  cycle_length: number;
}

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  chest: ['bench', 'chest', 'fly', 'push-up', 'pushup', 'pec'],
  back: ['row', 'pull', 'lat', 'deadlift', 'back'],
  shoulders: ['shoulder', 'press', 'lateral', 'delt', 'overhead'],
  biceps: ['curl', 'bicep'],
  triceps: ['tricep', 'extension', 'dip', 'pushdown'],
  legs: ['squat', 'leg', 'lunge', 'calf', 'hamstring', 'quad'],
  core: ['ab', 'plank', 'crunch', 'core', 'sit-up'],
};

function identifyMuscleGroups(exercises: Exercise[]): string[] {
  const found = new Set<string>();
  for (const ex of exercises) {
    const n = ex.name.toLowerCase();
    for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
      if (keywords.some((kw) => n.includes(kw))) found.add(group);
    }
  }
  return [...found];
}

function volumeOf(exercises: Exercise[]): number {
  return exercises.reduce(
    (sum, ex) => sum + ex.sets * ex.reps * (ex.weight ?? 0) * (ex.per_side ? 2 : 1),
    0,
  );
}

/** Sessions from the current and previous month, sorted by date (gap analysis). */
async function recentSessions(): Promise<RecentSession[]> {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1; // 1-12
  const prevM = m - 1 || 12;
  const prevY = m > 1 ? y : y - 1;

  const [thisMonth, prevMonth] = await Promise.all([
    getCalendarSessions(y, m),
    getCalendarSessions(prevY, prevM),
  ]);

  return [...thisMonth, ...prevMonth]
    .map((s) => ({
      date: s.date,
      workout_day: s.workout_day,
      exercise_count: s.exercise_count,
      total_volume: s.total_volume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function buildWorkoutContext(): Promise<WorkoutContextData> {
  const [exercises, recent, cycleLength] = await Promise.all([
    getAllActiveExercises(),
    recentSessions(),
    getCycleLength(),
  ]);
  return {
    exercises,
    total_volume: volumeOf(exercises),
    exercise_count: exercises.length,
    muscle_groups_worked: identifyMuscleGroups(exercises),
    recent_sessions: recent,
    cycle_length: cycleLength,
  };
}

export async function buildOverloadContext(exerciseNames?: string[]): Promise<{
  ctx: WorkoutContextData;
  weightProgress: { metric: string; exercises: Record<string, { date: string; value: number }[]> };
  volumeProgress: { metric: string; exercises: Record<string, { date: string; value: number }[]> };
}> {
  let exercises = await getAllActiveExercises();
  if (exerciseNames && exerciseNames.length) {
    const filter = new Set(exerciseNames.map((n) => n.toLowerCase()));
    exercises = exercises.filter((e) => filter.has(e.name.toLowerCase()));
  }

  const cycleLength = await getCycleLength();
  const ctx: WorkoutContextData = {
    exercises,
    total_volume: volumeOf(exercises),
    exercise_count: exercises.length,
    muscle_groups_worked: identifyMuscleGroups(exercises),
    recent_sessions: [],
    cycle_length: cycleLength,
  };

  if (exercises.length === 0) {
    const empty = { metric: '', exercises: {} };
    return { ctx, weightProgress: empty, volumeProgress: empty };
  }

  const names = exercises.map((e) => e.name);
  const [weightProgress, volumeProgress] = await Promise.all([
    getExerciseProgressBatch(names, 'weight'),
    getExerciseProgressBatch(names, 'volume'),
  ]);
  return { ctx, weightProgress, volumeProgress };
}

// ---------- prompt formatting (ported from agent.py) ----------

function formatGapAnalysis(ctx: WorkoutContextData): string {
  const sessions = ctx.recent_sessions;
  if (!sessions.length) return '\n\nRecent Workout History: No sessions logged yet.\n';

  const today = new Date();
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const parse = (d: string) => {
    const [y, mo, da] = d.split('-').map(Number);
    return Date.UTC(y, mo - 1, da);
  };
  const daysBetween = (a: number, b: number) => Math.round((a - b) / 86400000);
  const cutoff = todayMs - 30 * 86400000;

  const recent = sessions.filter((s) => parse(s.date) >= cutoff);
  if (!recent.length) {
    const last = sessions[sessions.length - 1];
    const daysAgo = daysBetween(todayMs, parse(last.date));
    return (
      `\n\nRecent Workout History:\n` +
      `- Last workout: ${daysAgo} day(s) ago (${last.date}, Day ${last.workout_day})\n` +
      `- No sessions in the last 30 days — long break detected.\n`
    );
  }

  const lastSession = recent[recent.length - 1];
  const daysSinceLast = daysBetween(todayMs, parse(lastSession.date));
  const countLast7 = recent.filter((s) => parse(s.date) >= todayMs - 7 * 86400000).length;
  const countLast14 = recent.filter((s) => parse(s.date) >= todayMs - 14 * 86400000).length;

  const dates = recent.map((s) => parse(s.date)).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 0; i < dates.length - 1; i++) gaps.push(daysBetween(dates[i + 1], dates[i]));
  const maxGap = gaps.length ? Math.max(...gaps) : 0;
  let gapLine = '';
  if (maxGap > 3 && gaps.length) {
    const idx = gaps.indexOf(maxGap);
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    gapLine = `- Longest gap in last 30 days: ${maxGap} days (${fmt(dates[idx])} → ${fmt(dates[idx + 1])})\n`;
  }

  let ctxStr = '\n\nRecent Workout History (last 30 days):\n';
  ctxStr += `- Last workout: ${daysSinceLast} day(s) ago (${lastSession.date}, Day ${lastSession.workout_day})\n`;
  ctxStr += `- Sessions in last 7 days: ${countLast7}\n`;
  ctxStr += `- Sessions in last 14 days: ${countLast14}\n`;
  ctxStr += `- Sessions in last 30 days: ${recent.length}\n`;
  ctxStr += gapLine;
  if (daysSinceLast >= 7) ctxStr += `- ⚠ Currently ${daysSinceLast} days since last workout — significant gap.\n`;
  else if (daysSinceLast >= 4) ctxStr += `- Note: ${daysSinceLast} days since last workout.\n`;

  ctxStr += '\nRecent sessions (newest first):\n';
  for (const s of [...recent].slice(-10).reverse()) {
    const vol = s.total_volume ? `, ${s.total_volume.toFixed(0)}kg vol` : '';
    ctxStr += `  - ${s.date}: Day ${s.workout_day} (${s.exercise_count} exercises${vol})\n`;
  }
  return ctxStr;
}

export function formatWorkoutContext(ctx: WorkoutContextData | null): string {
  if (!ctx || !ctx.exercises.length) return '';

  let out = '\n\nCurrent Workout Data:\n';
  out += `- Total Exercises: ${ctx.exercise_count}\n`;
  out += `- Total Volume: ${ctx.total_volume.toFixed(1)} kg\n`;
  out += `- Muscle Groups Worked: ${ctx.muscle_groups_worked.join(', ') || 'Not identified'}\n`;

  const workoutDays = new Set(ctx.exercises.map((e) => e.workout_day));
  const daily = ctx.exercises.filter((e) => e.workout_day === 'None');
  const splitDays = [...workoutDays].filter((d) => d !== 'None');

  if (daily.length) out += `- Daily Exercises (done every day): ${daily.length} exercise(s)\n`;

  if (splitDays.length === 0 && daily.length) out += '- Workout Split: ALL DAILY (no specific day split)\n';
  else if (splitDays.length === 1) out += `- Workout Split: FULL BODY (all exercises on Day ${splitDays[0]})\n`;
  else if (splitDays.length === 2) out += `- Workout Split: A/B SPLIT (Days: ${splitDays.slice().sort().join(', ')})\n`;
  else if (splitDays.length === 3) out += `- Workout Split: A/B/C SPLIT (Days: ${splitDays.slice().sort().join(', ')})\n`;
  else if (splitDays.length > 0) out += `- Workout Split: ${splitDays.length}-DAY SPLIT (Days: ${splitDays.slice().sort().join(', ')})\n`;

  out += '\nExercises grouped by workout day:\n';

  const fmtEx = (ex: Exercise) => {
    const w = ex.weight ? ` @ ${ex.weight}kg` : ' (bodyweight)';
    return `    - [ID:${ex.id}] ${ex.name}: ${ex.sets} sets x ${ex.reps} reps${w}\n`;
  };

  if (daily.length) {
    out += '\n  Daily (Every Day):\n';
    for (const ex of daily) out += fmtEx(ex);
  }
  for (const day of splitDays.slice().sort()) {
    out += `\n  Day ${day}:\n`;
    for (const ex of ctx.exercises.filter((e) => e.workout_day === day)) out += fmtEx(ex);
  }

  out += formatGapAnalysis(ctx);
  return out;
}
