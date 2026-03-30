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
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ── Chest ──
  { name: 'Bench Press',             muscleGroup: 'Chest',     defaultSets: 4, defaultReps: 8  },
  { name: 'Barbell Bench Press',     muscleGroup: 'Chest',     defaultSets: 4, defaultReps: 8  },
  { name: 'Incline Bench Press',     muscleGroup: 'Chest',     defaultSets: 4, defaultReps: 8  },
  { name: 'Decline Bench Press',     muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Bench Press',    muscleGroup: 'Chest',     defaultSets: 4, defaultReps: 10 },
  { name: 'Incline Dumbbell Press',  muscleGroup: 'Chest',     defaultSets: 4, defaultReps: 10 },
  { name: 'Machine Chest Press',     muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Chest Press',             muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Smith Machine Bench Press', muscleGroup: 'Chest',   defaultSets: 3, defaultReps: 10 },
  { name: 'Push Up',                 muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Weighted Push Up',        muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Chest Dip',               muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Landmine Press',          muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 10 },
  { name: 'Floor Press',             muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 8  },
  { name: 'Svend Press',             muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Fly',            muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Chest Fly',               muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Incline Dumbbell Fly',    muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Fly',               muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Crossover',         muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'High to Low Cable Fly',   muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Low to High Cable Fly',   muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Upper Chest Cable Fly',   muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Upper Chest Fly',         muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },
  { name: 'Pec Deck',                muscleGroup: 'Chest',     defaultSets: 3, defaultReps: 15 },

  // ── Back ──
  { name: 'Cable Row',               muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Pullover',                muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Pullover',       muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Pullover',          muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Deadlift',                muscleGroup: 'Back',      defaultSets: 4, defaultReps: 5  },
  { name: 'Rack Pull',               muscleGroup: 'Back',      defaultSets: 3, defaultReps: 6  },
  { name: 'Deficit Deadlift',        muscleGroup: 'Back',      defaultSets: 3, defaultReps: 5  },
  { name: 'Trap Bar Deadlift',       muscleGroup: 'Back',      defaultSets: 4, defaultReps: 6  },
  { name: 'Pull Up',                 muscleGroup: 'Back',      defaultSets: 4, defaultReps: 8  },
  { name: 'Weighted Pull Up',        muscleGroup: 'Back',      defaultSets: 4, defaultReps: 6  },
  { name: 'Chin Up',                 muscleGroup: 'Back',      defaultSets: 3, defaultReps: 8  },
  { name: 'Neutral Grip Pull Up',    muscleGroup: 'Back',      defaultSets: 3, defaultReps: 8  },
  { name: 'Lat Pulldown',            muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Wide Grip Pulldown',      muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Close Grip Pulldown',     muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Straight Arm Pulldown',   muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Single Arm Pulldown',     muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Barbell Row',             muscleGroup: 'Back',      defaultSets: 4, defaultReps: 8  },
  { name: 'Underhand Barbell Row',   muscleGroup: 'Back',      defaultSets: 4, defaultReps: 8  },
  { name: 'Dumbbell Row',            muscleGroup: 'Back',      defaultSets: 3, defaultReps: 10 },
  { name: 'Seated Cable Row',        muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Wide Grip Cable Row',     muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Close Grip Cable Row',    muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Single Arm Cable Row',    muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'High Cable Row',          muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'T-Bar Row',               muscleGroup: 'Back',      defaultSets: 3, defaultReps: 10 },
  { name: 'Pendlay Row',             muscleGroup: 'Back',      defaultSets: 4, defaultReps: 5  },
  { name: 'Meadows Row',             muscleGroup: 'Back',      defaultSets: 3, defaultReps: 10 },
  { name: 'Chest Supported Row',     muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Machine Row',             muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Inverted Row',            muscleGroup: 'Back',      defaultSets: 3, defaultReps: 12 },
  { name: 'Face Pull',               muscleGroup: 'Back',      defaultSets: 3, defaultReps: 15 },
  { name: 'Seal Row',                muscleGroup: 'Back',      defaultSets: 3, defaultReps: 10 },

  // ── Shoulders ──
  { name: 'Shoulder Press',          muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 8  },
  { name: 'Overhead Press',          muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 8  },
  { name: 'Barbell Overhead Press',  muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 8  },
  { name: 'Seated Overhead Press',   muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 8  },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 10 },
  { name: 'Seated Dumbbell Press',   muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10 },
  { name: 'Arnold Press',            muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10 },
  { name: 'Machine Shoulder Press',  muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Smith Machine Press',     muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10 },
  { name: 'Lateral Raise',           muscleGroup: 'Shoulders', defaultSets: 4, defaultReps: 15 },
  { name: 'Cable Lateral Raise',     muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Machine Lateral Raise',   muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Lu Raise',                muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 10 },
  { name: 'Front Raise',             muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Front Raise',    muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Plate Front Raise',       muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Front Raise',       muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Rear Delt Fly',           muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Rear Delt Row',           muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Rear Delt Cable Fly',     muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Reverse Fly',             muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Dumbbell Reverse Fly',    muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Reverse Fly',       muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Reverse Pec Deck',        muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Face Pull',         muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Upright Row',             muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Upright Row',       muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 12 },
  { name: 'Shrugs',                  muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Shrug',                   muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Dumbbell Shrug',          muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },
  { name: 'Barbell Shrug',           muscleGroup: 'Shoulders', defaultSets: 3, defaultReps: 15 },

  // ── Biceps ──
  { name: 'Curl',                    muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Bicep Curl',              muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Barbell Curl',            muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'EZ Bar Curl',             muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Curl',           muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Alternating Dumbbell Curl', muscleGroup: 'Biceps',  defaultSets: 3, defaultReps: 12 },
  { name: 'Hammer Curl',             muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Cross Body Hammer Curl',  muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Preacher Curl',           muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'EZ Bar Preacher Curl',    muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'Incline Dumbbell Curl',   muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'Cable Curl',              muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Low Cable Curl',          muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Concentration Curl',      muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Spider Curl',             muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Reverse Curl',            muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Drag Curl',               muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },
  { name: 'Bayesian Curl',           muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Machine Curl',            muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 12 },
  { name: 'Zottman Curl',            muscleGroup: 'Biceps',    defaultSets: 3, defaultReps: 10 },

  // ── Triceps ──
  { name: 'Tricep Extension',        muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Tricep Pushdown',         muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Rope Pushdown',           muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Bar Pushdown',            muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Single Arm Pushdown',     muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Overhead Extension', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12 },
  { name: 'Cable Overhead Extension', muscleGroup: 'Triceps',  defaultSets: 3, defaultReps: 12 },
  { name: 'EZ Bar Overhead Extension', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12 },
  { name: 'Skull Crusher',           muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Skull Crusher',  muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 10 },
  { name: 'Close Grip Bench Press',  muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 10 },
  { name: 'Dip',                     muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Tricep Kickback',         muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'Diamond Push Up',         muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 12 },
  { name: 'JM Press',                muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 10 },
  { name: 'Bench Dip',               muscleGroup: 'Triceps',   defaultSets: 3, defaultReps: 15 },
  { name: 'Machine Tricep Extension', muscleGroup: 'Triceps',  defaultSets: 3, defaultReps: 12 },

  // ── Forearms ──
  { name: 'Wrist Curl',              muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 15 },
  { name: 'Reverse Wrist Curl',      muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 15 },
  { name: 'Dumbbell Wrist Curl',     muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Wrist Curl',        muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 15 },
  { name: 'Farmer Walk',             muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 1  },
  { name: 'Dead Hang',               muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 1  },
  { name: 'Plate Pinch',             muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 1  },
  { name: 'Towel Pull Up',           muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 6  },
  { name: 'Gripper',                 muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 10 },
  { name: 'Hammer Wrist Rotation',   muscleGroup: 'Forearms',  defaultSets: 3, defaultReps: 12 },

  // ── Quads ──
  { name: 'Squat',                   muscleGroup: 'Quads',     defaultSets: 4, defaultReps: 8  },
  { name: 'Lunge',                   muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Barbell Squat',           muscleGroup: 'Quads',     defaultSets: 4, defaultReps: 6  },
  { name: 'Front Squat',             muscleGroup: 'Quads',     defaultSets: 4, defaultReps: 8  },
  { name: 'Goblet Squat',            muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Squat',          muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Press',               muscleGroup: 'Quads',     defaultSets: 4, defaultReps: 10 },
  { name: 'Single Leg Press',        muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Hack Squat',              muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Leg Extension',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Single Leg Extension',    muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Bulgarian Split Squat',   muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Walking Lunge',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Dumbbell Lunge',          muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Barbell Lunge',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Reverse Lunge',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Step Up',                 muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Sissy Squat',             muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Pistol Squat',            muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 6  },
  { name: 'Smith Machine Squat',     muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Belt Squat',              muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },
  { name: 'Wall Sit',                muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 1  },
  { name: 'Hip Adduction',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 15 },
  { name: 'Hip Adduction Machine',   muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 15 },
  { name: 'Hip Abduction',           muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 15 },
  { name: 'Hip Abduction Machine',   muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 15 },
  { name: 'Knee Extension',          muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Sumo Squat',              muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 12 },
  { name: 'Landmine Squat',          muscleGroup: 'Quads',     defaultSets: 3, defaultReps: 10 },

  // ── Hamstrings ──
  { name: 'Romanian Deadlift',       muscleGroup: 'Hamstrings', defaultSets: 4, defaultReps: 8  },
  { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10 },
  { name: 'Stiff Leg Deadlift',      muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10 },
  { name: 'Good Morning',            muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10 },
  { name: 'Single Leg Deadlift',     muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Single Leg Deadlift', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 10 },
  { name: 'Cable Pull Through',      muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Knee Flexion',            muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Curl',                muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Lying Leg Curl',          muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Seated Leg Curl',         muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Standing Leg Curl',       muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },
  { name: 'Nordic Hamstring Curl',   muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 6  },
  { name: 'Glute Ham Raise',         muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 8  },
  { name: 'Swiss Ball Leg Curl',     muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12 },

  // ── Glutes ──
  { name: 'Glute Kickback',          muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Hip Thrust',              muscleGroup: 'Glutes',    defaultSets: 4, defaultReps: 10 },
  { name: 'Barbell Hip Thrust',      muscleGroup: 'Glutes',    defaultSets: 4, defaultReps: 10 },
  { name: 'Single Leg Hip Thrust',   muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 12 },
  { name: 'Glute Bridge',            muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Single Leg Glute Bridge', muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Banded Hip Thrust',       muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Frog Pump',               muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 20 },
  { name: 'Sumo Deadlift',           muscleGroup: 'Glutes',    defaultSets: 4, defaultReps: 6  },
  { name: 'Cable Kickback',          muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Donkey Kick',             muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Fire Hydrant',            muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Hip Extension',     muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 12 },
  { name: 'Machine Hip Extension',   muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 12 },
  { name: 'Reverse Hyperextension',  muscleGroup: 'Glutes',    defaultSets: 3, defaultReps: 15 },

  // ── Calves ──
  { name: 'Standing Calf Raise',     muscleGroup: 'Calves',    defaultSets: 4, defaultReps: 15 },
  { name: 'Seated Calf Raise',       muscleGroup: 'Calves',    defaultSets: 4, defaultReps: 15 },
  { name: 'Donkey Calf Raise',       muscleGroup: 'Calves',    defaultSets: 3, defaultReps: 15 },
  { name: 'Leg Press Calf Raise',    muscleGroup: 'Calves',    defaultSets: 4, defaultReps: 15 },
  { name: 'Single Leg Calf Raise',   muscleGroup: 'Calves',    defaultSets: 3, defaultReps: 15 },
  { name: 'Smith Machine Calf Raise', muscleGroup: 'Calves',   defaultSets: 4, defaultReps: 15 },
  { name: 'Tibialis Raise',          muscleGroup: 'Calves',    defaultSets: 3, defaultReps: 15 },

  // ── Core ──
  { name: 'Ab Crunch',               muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Crunches',                muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Penguins',                muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Leg Drop',                muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Leg Drops',               muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Scissor Kicks',           muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Heel Touch',              muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Reverse Crunch',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Plank',                   muscleGroup: 'Core',      defaultSets: 3, defaultReps: 1  },
  { name: 'Side Plank',              muscleGroup: 'Core',      defaultSets: 3, defaultReps: 1  },
  { name: 'Hollow Body Hold',        muscleGroup: 'Core',      defaultSets: 3, defaultReps: 1  },
  { name: 'Weighted Plank',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 1  },
  { name: 'Dead Bug',                muscleGroup: 'Core',      defaultSets: 3, defaultReps: 10 },
  { name: 'Pallof Press',            muscleGroup: 'Core',      defaultSets: 3, defaultReps: 12 },
  { name: 'Crunch',                  muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Bicycle Crunch',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Decline Crunch',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Crunch',            muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'V-Up',                    muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Toe Touch',               muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Hanging Leg Raise',       muscleGroup: 'Core',      defaultSets: 3, defaultReps: 12 },
  { name: 'Leg Raise',               muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Flutter Kick',            muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Mountain Climber',        muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Ab Rollout',              muscleGroup: 'Core',      defaultSets: 3, defaultReps: 10 },
  { name: 'Dragon Flag',             muscleGroup: 'Core',      defaultSets: 3, defaultReps: 6  },
  { name: 'Russian Twist',           muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Woodchop',                muscleGroup: 'Core',      defaultSets: 3, defaultReps: 12 },
  { name: 'Toes to Bar',             muscleGroup: 'Core',      defaultSets: 3, defaultReps: 10 },
  { name: 'Windshield Wiper',        muscleGroup: 'Core',      defaultSets: 3, defaultReps: 10 },
  { name: 'Sit Up',                  muscleGroup: 'Core',      defaultSets: 3, defaultReps: 20 },
  { name: 'Decline Sit Up',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 15 },
  { name: 'Cable Woodchop',          muscleGroup: 'Core',      defaultSets: 3, defaultReps: 12 },
  { name: 'Landmine Rotation',       muscleGroup: 'Core',      defaultSets: 3, defaultReps: 10 },

  // ── Full Body ──
  { name: 'Clean and Press',         muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 5  },
  { name: 'Thruster',                muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10 },
  { name: 'Burpee',                  muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10 },
  { name: 'Kettlebell Swing',        muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 15 },
  { name: 'Turkish Get Up',          muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 5  },
  { name: 'Man Maker',               muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 8  },
  { name: 'Power Clean',             muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 5  },
  { name: 'Snatch',                  muscleGroup: 'Full Body', defaultSets: 4, defaultReps: 3  },
  { name: 'Wall Ball',               muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 15 },
  { name: 'Devil Press',             muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 10 },
  { name: 'Dumbbell Clean',          muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 8  },
  { name: 'Renegade Row',            muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 8  },
  { name: 'Bear Crawl',              muscleGroup: 'Full Body', defaultSets: 3, defaultReps: 1  },

  // ── Cardio ──
  { name: 'Running',                 muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Treadmill',               muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Cycling',                 muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Stationary Bike',         muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Rowing Machine',          muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Jump Rope',               muscleGroup: 'Cardio',    defaultSets: 3, defaultReps: 1  },
  { name: 'Stair Climber',           muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Elliptical',              muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Battle Ropes',            muscleGroup: 'Cardio',    defaultSets: 3, defaultReps: 1  },
  { name: 'Box Jump',                muscleGroup: 'Cardio',    defaultSets: 3, defaultReps: 10 },
  { name: 'Sled Push',               muscleGroup: 'Cardio',    defaultSets: 3, defaultReps: 1  },
  { name: 'Sled Pull',               muscleGroup: 'Cardio',    defaultSets: 3, defaultReps: 1  },
  { name: 'Assault Bike',            muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Swimming',                muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Hiking',                  muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
  { name: 'Sprints',                 muscleGroup: 'Cardio',    defaultSets: 5, defaultReps: 1  },
  { name: 'Ski Erg',                 muscleGroup: 'Cardio',    defaultSets: 1, defaultReps: 1  },
];

const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  'Chest':     'text-rose-400',
  'Back':      'text-blue-400',
  'Shoulders': 'text-violet-400',
  'Biceps':    'text-pink-400',
  'Triceps':   'text-fuchsia-400',
  'Forearms':  'text-orange-400',
  'Quads':     'text-emerald-400',
  'Hamstrings':'text-teal-400',
  'Glutes':    'text-green-400',
  'Calves':    'text-lime-400',
  'Core':      'text-yellow-400',
  'Full Body': 'text-amber-400',
  'Cardio':    'text-red-400',
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
    if (lower === q) exact.push(ex);
    else if (lower.startsWith(q)) startsWith.push(ex);
    else if (lower.includes(q) || ex.muscleGroup.toLowerCase().includes(q)) contains.push(ex);
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

/**
 * Returns all library exercises in the same muscle group as the given exercise name,
 * excluding itself. Used for mid-workout "Try a variant" suggestions.
 */
export function getLibraryVariants(exerciseName: string): LibraryExercise[] {
  const lower = exerciseName.toLowerCase().trim();
  const entry = EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === lower);
  if (!entry) return [];
  return EXERCISE_LIBRARY.filter(
    e => e.muscleGroup === entry.muscleGroup && e.name.toLowerCase() !== lower
  );
}
