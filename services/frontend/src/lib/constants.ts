export const DAY_LABELS: Record<string, string> = {
  A: 'Day A',
  B: 'Day B',
  C: 'Day C',
  D: 'Day D',
  E: 'Day E',
  F: 'Day F',
  G: 'Day G',
  H: 'Day H',
  I: 'Day I',
  J: 'Day J',
  K: 'Day K',
  L: 'Day L',
  M: 'Day M',
  N: 'Day N',
  Daily: 'Daily',
  None: 'Unassigned',
};

export const DAY_COLORS: Record<string, { hex: string; bg: string; text: string; border: string; accent: string }> = {
  A: { hex: '#F97316', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', accent: 'bg-orange-500' },
  B: { hex: '#3B82F6', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', accent: 'bg-blue-500' },
  C: { hex: '#10B981', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', accent: 'bg-emerald-500' },
  D: { hex: '#8B5CF6', bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', accent: 'bg-violet-500' },
  E: { hex: '#EC4899', bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30', accent: 'bg-pink-500' },
  F: { hex: '#F59E0B', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', accent: 'bg-amber-500' },
  G: { hex: '#06B6D4', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', accent: 'bg-cyan-500' },
  H: { hex: '#EF4444', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', accent: 'bg-red-500' },
  I: { hex: '#14B8A6', bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', accent: 'bg-teal-500' },
  J: { hex: '#A855F7', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', accent: 'bg-purple-500' },
  K: { hex: '#F43F5E', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', accent: 'bg-rose-500' },
  L: { hex: '#0EA5E9', bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30', accent: 'bg-sky-500' },
  M: { hex: '#84CC16', bg: 'bg-lime-500/15', text: 'text-lime-400', border: 'border-lime-500/30', accent: 'bg-lime-500' },
  N: { hex: '#FB923C', bg: 'bg-orange-400/15', text: 'text-orange-300', border: 'border-orange-400/30', accent: 'bg-orange-400' },
  Daily: { hex: '#94A3B8', bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', accent: 'bg-slate-500' },
  None: { hex: '#57534E', bg: 'bg-stone-500/15', text: 'text-stone-400', border: 'border-stone-500/30', accent: 'bg-stone-500' },
};

export function getDayColor(day: string) {
  return DAY_COLORS[day] || DAY_COLORS.None;
}

export const ALL_DAYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Daily'] as const;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function getActiveDays(cycleLength: number): string[] {
  const n = Math.max(1, Math.min(26, cycleLength));
  return [...Array.from({ length: n }, (_, i) => LETTERS[i]), 'Daily'];
}

export const MUSCLE_GROUPS = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
  { value: 'upper_lower', label: 'Upper / Lower Split' },
  { value: 'push_pull_legs', label: 'Push / Pull / Legs Split' },
  { value: 'other', label: 'Other…' },
] as const;

export const EQUIPMENT_OPTIONS = [
  'barbell', 'dumbbells', 'cables', 'machines',
  'pull-up bar', 'bodyweight', 'kettlebells', 'resistance bands',
] as const;

export const TRAINING_GOALS = [
  { value: 'hypertrophy', label: 'Muscle Growth' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'general_fitness', label: 'General Fitness' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;
