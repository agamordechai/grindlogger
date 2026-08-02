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

// Loot-rarity ladder — each training day gets a saturated comic tone.
export const DAY_COLORS: Record<string, { hex: string; bg: string; text: string; border: string; accent: string }> = {
  A: { hex: '#FF7A00', bg: 'bg-[#FF7A00]/15', text: 'text-[#FF7A00]', border: 'border-[#FF7A00]/40', accent: 'bg-[#FF7A00]' }, // legendary
  B: { hex: '#2FA8FF', bg: 'bg-[#2FA8FF]/15', text: 'text-[#2FA8FF]', border: 'border-[#2FA8FF]/40', accent: 'bg-[#2FA8FF]' }, // rare
  C: { hex: '#3DE84F', bg: 'bg-[#3DE84F]/15', text: 'text-[#3DE84F]', border: 'border-[#3DE84F]/40', accent: 'bg-[#3DE84F]' }, // uncommon
  D: { hex: '#B24BF3', bg: 'bg-[#B24BF3]/15', text: 'text-[#B24BF3]', border: 'border-[#B24BF3]/40', accent: 'bg-[#B24BF3]' }, // epic
  E: { hex: '#FF3D8A', bg: 'bg-[#FF3D8A]/15', text: 'text-[#FF3D8A]', border: 'border-[#FF3D8A]/40', accent: 'bg-[#FF3D8A]' }, // magenta
  F: { hex: '#FFD400', bg: 'bg-[#FFD400]/15', text: 'text-[#FFD400]', border: 'border-[#FFD400]/40', accent: 'bg-[#FFD400]' }, // hazard
  G: { hex: '#00E5D0', bg: 'bg-[#00E5D0]/15', text: 'text-[#00E5D0]', border: 'border-[#00E5D0]/40', accent: 'bg-[#00E5D0]' }, // seraph
  H: { hex: '#FF3B30', bg: 'bg-[#FF3B30]/15', text: 'text-[#FF3B30]', border: 'border-[#FF3B30]/40', accent: 'bg-[#FF3B30]' }, // flame
  I: { hex: '#14C8FF', bg: 'bg-[#14C8FF]/15', text: 'text-[#14C8FF]', border: 'border-[#14C8FF]/40', accent: 'bg-[#14C8FF]' }, // arc
  J: { hex: '#A855F7', bg: 'bg-[#A855F7]/15', text: 'text-[#A855F7]', border: 'border-[#A855F7]/40', accent: 'bg-[#A855F7]' }, // violet
  K: { hex: '#FF6B1A', bg: 'bg-[#FF6B1A]/15', text: 'text-[#FF6B1A]', border: 'border-[#FF6B1A]/40', accent: 'bg-[#FF6B1A]' }, // ember
  L: { hex: '#7CFF4F', bg: 'bg-[#7CFF4F]/15', text: 'text-[#7CFF4F]', border: 'border-[#7CFF4F]/40', accent: 'bg-[#7CFF4F]' }, // lime
  M: { hex: '#FF8AC4', bg: 'bg-[#FF8AC4]/15', text: 'text-[#FF8AC4]', border: 'border-[#FF8AC4]/40', accent: 'bg-[#FF8AC4]' }, // pink
  N: { hex: '#5B8CFF', bg: 'bg-[#5B8CFF]/15', text: 'text-[#5B8CFF]', border: 'border-[#5B8CFF]/40', accent: 'bg-[#5B8CFF]' }, // indigo
  Daily: { hex: '#9C948A', bg: 'bg-[#9C948A]/15', text: 'text-[#9C948A]', border: 'border-[#9C948A]/40', accent: 'bg-[#9C948A]' },
  None: { hex: '#57534E', bg: 'bg-[#57534E]/15', text: 'text-[#8A8078]', border: 'border-[#57534E]/40', accent: 'bg-[#57534E]' },
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
