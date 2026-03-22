export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Full Body'
  | 'Cardio';

export interface LibraryExercise {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number | null;
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ── Chest ──
  { name: 'Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultReps: 8, defaultWeight: 60 },
  { name: 'Incline Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultReps: 8, defaultWeight: 50 },
  { name: 'Decline Bench Press', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 10, defaultWeight: 50 },
  { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultReps: 10, defaultWeight: 24 },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', defaultSets: 4, defaultReps: 10, defaultWeight: 22 },
  { name: 'Dumbbell Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 14 },
  { name: 'Incline Dumbbell Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Cable Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: 10 },
  { name: 'High to Low Cable Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: 10 },
  { name: 'Low to High Cable Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: 8 },
  { name: 'Upper Chest Cable Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: 8 },
  { name: 'Chest Dip', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Push Up', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Machine Chest Press', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 40 },
  { name: 'Pec Deck', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 15, defaultWeight: 30 },
  { name: 'Landmine Press', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 10, defaultWeight: 20 },
  { name: 'Svend Press', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },

  // ── Back ──
  { name: 'Deadlift', muscleGroup: 'Back', defaultSets: 4, defaultReps: 5, defaultWeight: 100 },
  { name: 'Pull Up', muscleGroup: 'Back', defaultSets: 4, defaultReps: 8, defaultWeight: null },
  { name: 'Chin Up', muscleGroup: 'Back', defaultSets: 3, defaultReps: 8, defaultWeight: null },
  { name: 'Barbell Row', muscleGroup: 'Back', defaultSets: 4, defaultReps: 8, defaultWeight: 60 },
  { name: 'Dumbbell Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 10, defaultWeight: 24 },
  { name: 'Seated Cable Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 40 },
  { name: 'Lat Pulldown', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 45 },
  { name: 'T-Bar Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 10, defaultWeight: 40 },
  { name: 'Face Pull', muscleGroup: 'Back', defaultSets: 3, defaultReps: 15, defaultWeight: 15 },
  { name: 'Straight Arm Pulldown', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },
  { name: 'Rack Pull', muscleGroup: 'Back', defaultSets: 3, defaultReps: 6, defaultWeight: 80 },
  { name: 'Pendlay Row', muscleGroup: 'Back', defaultSets: 4, defaultReps: 5, defaultWeight: 60 },
  { name: 'Meadows Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 10, defaultWeight: 20 },
  { name: 'Chest Supported Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },
  { name: 'Inverted Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Wide Grip Pulldown', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 40 },
  { name: 'Close Grip Pulldown', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 40 },
  { name: 'Single Arm Cable Row', muscleGroup: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },

  // ── Shoulders ──
  { name: 'Overhead Press', muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 8, defaultWeight: 40 },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 10, defaultWeight: 18 },
  { name: 'Arnold Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10, defaultWeight: 16 },
  { name: 'Lateral Raise', muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 15, defaultWeight: 8 },
  { name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 5 },
  { name: 'Front Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12, defaultWeight: 8 },
  { name: 'Reverse Fly', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 8 },
  { name: 'Upright Row', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12, defaultWeight: 25 },
  { name: 'Shrug', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 30 },
  { name: 'Dumbbell Shrug', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 24 },
  { name: 'Lu Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10, defaultWeight: 5 },
  { name: 'Machine Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12, defaultWeight: 30 },
  { name: 'Cable Face Pull', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 10 },
  { name: 'Plate Front Raise', muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },

  // ── Biceps ──
  { name: 'Barbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 10, defaultWeight: 25 },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Hammer Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Preacher Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 10, defaultWeight: 20 },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 10, defaultWeight: 10 },
  { name: 'Cable Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },
  { name: 'Concentration Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },
  { name: 'EZ Bar Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 10, defaultWeight: 25 },
  { name: 'Spider Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 8 },
  { name: 'Reverse Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },
  { name: 'Drag Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 10, defaultWeight: 20 },
  { name: 'Bayesian Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, defaultWeight: 8 },

  // ── Triceps ──
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },
  { name: 'Skull Crusher', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 10, defaultWeight: 20 },
  { name: 'Close Grip Bench Press', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 10, defaultWeight: 50 },
  { name: 'Dip', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Tricep Kickback', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: 8 },
  { name: 'Diamond Push Up', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Cable Overhead Extension', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, defaultWeight: 15 },
  { name: 'JM Press', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 10, defaultWeight: 30 },
  { name: 'Bench Dip', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 15, defaultWeight: null },

  // ── Forearms ──
  { name: 'Wrist Curl', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 15, defaultWeight: 10 },
  { name: 'Reverse Wrist Curl', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 15, defaultWeight: 8 },
  { name: 'Farmer Walk', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 1, defaultWeight: 30 },
  { name: 'Dead Hang', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Plate Pinch', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 1, defaultWeight: 10 },
  { name: 'Towel Pull Up', muscleGroup: 'Forearms', defaultSets: 3, defaultReps: 6, defaultWeight: null },

  // ── Quads ──
  { name: 'Barbell Squat', muscleGroup: 'Quads', defaultSets: 4, defaultReps: 6, defaultWeight: 80 },
  { name: 'Front Squat', muscleGroup: 'Quads', defaultSets: 4, defaultReps: 8, defaultWeight: 60 },
  { name: 'Goblet Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },
  { name: 'Leg Press', muscleGroup: 'Quads', defaultSets: 4, defaultReps: 10, defaultWeight: 120 },
  { name: 'Hack Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 10, defaultWeight: 60 },
  { name: 'Leg Extension', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: 35 },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 10, defaultWeight: 14 },
  { name: 'Walking Lunge', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Sissy Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Wall Sit', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Step Up', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Pistol Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 6, defaultWeight: null },
  { name: 'Smith Machine Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 10, defaultWeight: 60 },
  { name: 'Belt Squat', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 10, defaultWeight: 40 },
  { name: 'Reverse Lunge', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, defaultWeight: 12 },
  { name: 'Hip Adduction Machine', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 15, defaultWeight: 40 },
  { name: 'Hip Abduction Machine', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 15, defaultWeight: 35 },

  // ── Hamstrings ──
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', defaultSets: 4, defaultReps: 8, defaultWeight: 70 },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12, defaultWeight: 30 },
  { name: 'Seated Leg Curl', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12, defaultWeight: 30 },
  { name: 'Stiff Leg Deadlift', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10, defaultWeight: 60 },
  { name: 'Good Morning', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10, defaultWeight: 30 },
  { name: 'Nordic Hamstring Curl', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 6, defaultWeight: null },
  { name: 'Glute Ham Raise', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 8, defaultWeight: null },
  { name: 'Single Leg Deadlift', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10, defaultWeight: 14 },
  { name: 'Cable Pull Through', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12, defaultWeight: 20 },

  // ── Glutes ──
  { name: 'Hip Thrust', muscleGroup: 'Glutes', defaultSets: 4, defaultReps: 10, defaultWeight: 60 },
  { name: 'Barbell Hip Thrust', muscleGroup: 'Glutes', defaultSets: 4, defaultReps: 10, defaultWeight: 80 },
  { name: 'Cable Kickback', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 15, defaultWeight: 10 },
  { name: 'Glute Bridge', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Sumo Deadlift', muscleGroup: 'Glutes', defaultSets: 4, defaultReps: 6, defaultWeight: 80 },
  { name: 'Frog Pump', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 20, defaultWeight: null },
  { name: 'Banded Hip Thrust', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Donkey Kick', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Fire Hydrant', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Cable Hip Extension', muscleGroup: 'Glutes', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },

  // ── Calves ──
  { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultReps: 15, defaultWeight: 40 },
  { name: 'Seated Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultReps: 15, defaultWeight: 25 },
  { name: 'Donkey Calf Raise', muscleGroup: 'Calves', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Leg Press Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultReps: 15, defaultWeight: 80 },
  { name: 'Single Leg Calf Raise', muscleGroup: 'Calves', defaultSets: 3, defaultReps: 15, defaultWeight: null },

  // ── Core ──
  { name: 'Plank', muscleGroup: 'Core', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Crunch', muscleGroup: 'Core', defaultSets: 3, defaultReps: 20, defaultWeight: null },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core', defaultSets: 3, defaultReps: 12, defaultWeight: null },
  { name: 'Cable Crunch', muscleGroup: 'Core', defaultSets: 3, defaultReps: 15, defaultWeight: 25 },
  { name: 'Ab Rollout', muscleGroup: 'Core', defaultSets: 3, defaultReps: 10, defaultWeight: null },
  { name: 'Russian Twist', muscleGroup: 'Core', defaultSets: 3, defaultReps: 20, defaultWeight: 5 },
  { name: 'Mountain Climber', muscleGroup: 'Core', defaultSets: 3, defaultReps: 20, defaultWeight: null },
  { name: 'Bicycle Crunch', muscleGroup: 'Core', defaultSets: 3, defaultReps: 20, defaultWeight: null },
  { name: 'Leg Raise', muscleGroup: 'Core', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Side Plank', muscleGroup: 'Core', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Woodchop', muscleGroup: 'Core', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },
  { name: 'Dead Bug', muscleGroup: 'Core', defaultSets: 3, defaultReps: 10, defaultWeight: null },
  { name: 'Pallof Press', muscleGroup: 'Core', defaultSets: 3, defaultReps: 12, defaultWeight: 10 },
  { name: 'Hollow Body Hold', muscleGroup: 'Core', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Dragon Flag', muscleGroup: 'Core', defaultSets: 3, defaultReps: 6, defaultWeight: null },
  { name: 'Decline Crunch', muscleGroup: 'Core', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Weighted Plank', muscleGroup: 'Core', defaultSets: 3, defaultReps: 1, defaultWeight: 10 },
  { name: 'V-Up', muscleGroup: 'Core', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Toe Touch', muscleGroup: 'Core', defaultSets: 3, defaultReps: 15, defaultWeight: null },
  { name: 'Flutter Kick', muscleGroup: 'Core', defaultSets: 3, defaultReps: 20, defaultWeight: null },

  // ── Full Body ──
  { name: 'Clean and Press', muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 5, defaultWeight: 50 },
  { name: 'Thruster', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10, defaultWeight: 30 },
  { name: 'Burpee', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10, defaultWeight: null },
  { name: 'Kettlebell Swing', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 15, defaultWeight: 16 },
  { name: 'Turkish Get Up', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 5, defaultWeight: 12 },
  { name: 'Man Maker', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 8, defaultWeight: 12 },
  { name: 'Power Clean', muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 5, defaultWeight: 50 },
  { name: 'Snatch', muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 3, defaultWeight: 40 },
  { name: 'Wall Ball', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 15, defaultWeight: 9 },
  { name: 'Devil Press', muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10, defaultWeight: 12 },

  // ── Cardio ──
  { name: 'Running', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Cycling', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Rowing Machine', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Jump Rope', muscleGroup: 'Cardio', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Stair Climber', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Elliptical', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Battle Ropes', muscleGroup: 'Cardio', defaultSets: 3, defaultReps: 1, defaultWeight: null },
  { name: 'Box Jump', muscleGroup: 'Cardio', defaultSets: 3, defaultReps: 10, defaultWeight: null },
  { name: 'Sled Push', muscleGroup: 'Cardio', defaultSets: 3, defaultReps: 1, defaultWeight: 40 },
  { name: 'Assault Bike', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Swimming', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Hiking', muscleGroup: 'Cardio', defaultSets: 1, defaultReps: 1, defaultWeight: null },
  { name: 'Sprints', muscleGroup: 'Cardio', defaultSets: 5, defaultReps: 1, defaultWeight: null },
];

const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  'Chest': 'text-rose-400',
  'Back': 'text-blue-400',
  'Shoulders': 'text-violet-400',
  'Biceps': 'text-pink-400',
  'Triceps': 'text-fuchsia-400',
  'Forearms': 'text-orange-400',
  'Quads': 'text-emerald-400',
  'Hamstrings': 'text-teal-400',
  'Glutes': 'text-green-400',
  'Calves': 'text-lime-400',
  'Core': 'text-yellow-400',
  'Full Body': 'text-amber-400',
  'Cardio': 'text-red-400',
};

export function getMuscleGroupColor(group: MuscleGroup): string {
  return MUSCLE_GROUP_COLORS[group] || 'text-steel';
}

export function searchLibrary(query: string, limit = 8): LibraryExercise[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const exact: LibraryExercise[] = [];
  const startsWith: LibraryExercise[] = [];
  const contains: LibraryExercise[] = [];

  for (const ex of EXERCISE_LIBRARY) {
    const lower = ex.name.toLowerCase();
    if (lower === q) {
      exact.push(ex);
    } else if (lower.startsWith(q)) {
      startsWith.push(ex);
    } else if (lower.includes(q) || ex.muscleGroup.toLowerCase().includes(q)) {
      contains.push(ex);
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}
