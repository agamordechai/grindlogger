/**
 * On-device AI coach — ports services/ai_coach/src/agent.py (Anthropic path).
 *
 * Calls the Anthropic API directly from the app with the user's key. Chat tools
 * act on the local repositories; recommend/analyze/overload use forced tool-use
 * for reliable structured JSON.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatResponse,
  ChatMessage,
  ActionPerformed,
  RecommendationRequest,
  WorkoutRecommendation,
  ProgressAnalysis,
  OverloadSuggestions,
  ExerciseOverloadSuggestion,
} from '../types/aiCoach';
import { resolveCredentials, DEFAULT_MODEL, type ResolvedCredentials } from './credentials';
import {
  buildWorkoutContext,
  buildOverloadContext,
  formatWorkoutContext,
  type WorkoutContextData,
} from './context';
import { createExercise, updateExercise } from '../db/repositories/exercises';
import { createSession } from '../db/repositories/sessions';
import { createMeasurement } from '../db/repositories/measurements';

const TEMPERATURE = 0.7;
const MAX_TOKENS = 4096;
const MAX_ITERS = 25;

const MUSCLE_GROUP_ENUM = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core',
  'full_body', 'upper_lower', 'push_pull_legs',
];

const COACH_SYSTEM_PROMPT = `You are an expert fitness coach and personal trainer AI assistant.
Your role is to help users with their workout routines, provide exercise recommendations,
answer fitness-related questions, and analyze their training progress.

Key responsibilities:
1. Provide personalized workout recommendations based on the user's current exercises
2. Suggest complementary exercises for balanced muscle development
3. Offer form tips and safety advice
4. Help users understand proper training volume and progression
5. Motivate and encourage users in their fitness journey
6. Perform actions on behalf of the user when asked — add exercises, log workouts, record measurements

Guidelines:
- Be encouraging but honest
- Prioritize safety and proper form
- Consider the user's current workout data when making recommendations
- Provide specific, actionable advice
- Use clear, simple language avoiding excessive jargon
- When suggesting weights, be conservative and emphasize starting light
- Today's date is {today}

Action guidelines:
- When the user asks you to add, create, modify, or log something, USE THE TOOLS immediately.
  Do not just describe what you would do — actually do it.
- You can call multiple tools in one turn (e.g. bulk-add several exercises at once).
- After performing actions, briefly confirm what you did.
- Do NOT ask excessive clarifying questions. If the user's intent is clear, act on it.
  Use reasonable defaults for anything unspecified (e.g. default workout_day "A", today's date for logging).
- Only ask for clarification when genuinely ambiguous (e.g. "add an exercise" with no details).
- Keep responses concise and focused. Avoid repeating back what the user said or listing things they already know.

If workout context is provided, analyze it and tailor your responses accordingly.
`;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeClient(creds: ResolvedCredentials): Anthropic {
  if (!creds.api_key) {
    throw new Error('AI API key required. Please set your API key in Settings.');
  }
  return new Anthropic({
    apiKey: creds.api_key,
    dangerouslyAllowBrowser: true,
    ...(creds.base_url ? { baseURL: creds.base_url } : {}),
  });
}

function modelId(creds: ResolvedCredentials): string {
  return (creds.model || DEFAULT_MODEL).replace(/^anthropic:/, '');
}

// ---------- tools (ported from build_coach_tools) ----------

function buildCoachTools(cycleLength = 7): Anthropic.Tool[] {
  const n = Math.max(1, Math.min(26, cycleLength));
  const letterDays = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
  const letterDaysWithNone = [...letterDays, 'None'];
  const lastLetter = String.fromCharCode(64 + n);

  return [
    {
      name: 'create_exercise',
      description: "Add a new exercise to the user's workout plan. Use this when the user asks to add an exercise.",
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "Exercise name (e.g. 'Bench Press', 'Squat')" },
          sets: { type: 'integer', description: 'Number of sets (1-100)' },
          reps: { type: 'integer', description: 'Number of reps per set (1-1000)' },
          weight: { type: 'number', description: 'Weight in kg (omit or null for bodyweight exercises)' },
          workout_day: {
            type: 'string',
            enum: letterDaysWithNone,
            description: `Workout day letter (A–${lastLetter}). Use 'None' for daily exercises.`,
          },
          notes: { type: 'string', description: 'Optional notes or cues for the exercise' },
        },
        required: ['name', 'sets', 'reps'],
      },
    },
    {
      name: 'edit_exercise',
      description:
        'Modify an existing exercise. Use this when the user asks to change sets, reps, weight, name, ' +
        'or day of an exercise. Requires the exercise ID from the workout context.',
      input_schema: {
        type: 'object',
        properties: {
          exercise_id: { type: 'integer', description: 'ID of the exercise to edit (from workout context)' },
          name: { type: 'string', description: 'New exercise name' },
          sets: { type: 'integer', description: 'New number of sets' },
          reps: { type: 'integer', description: 'New number of reps' },
          weight: { type: 'number', description: 'New weight in kg' },
          workout_day: {
            type: 'string',
            enum: letterDaysWithNone,
            description: `New workout day letter (A–${lastLetter}). Use 'None' for daily exercises.`,
          },
          notes: { type: 'string', description: 'New notes' },
        },
        required: ['exercise_id'],
      },
    },
    {
      name: 'log_workout',
      description:
        'Log a completed workout session. Use this when the user says they finished a workout ' +
        'or wants to log exercises they did today.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Workout date in YYYY-MM-DD format' },
          workout_day: { type: 'string', enum: letterDays, description: `Which workout day was performed (A–${lastLetter}).` },
          notes: { type: 'string', description: 'Optional session notes' },
          duration_minutes: { type: 'integer', description: 'Workout duration in minutes' },
          exercises: {
            type: 'array',
            description: 'Exercises performed in this session',
            items: {
              type: 'object',
              properties: {
                exercise_name: { type: 'string' },
                sets_completed: { type: 'integer' },
                reps_completed: { type: 'integer' },
                weight_used: { type: 'number', description: 'Weight in kg' },
              },
              required: ['exercise_name', 'sets_completed', 'reps_completed'],
            },
          },
        },
        required: ['date', 'workout_day', 'exercises'],
      },
    },
    {
      name: 'add_measurement',
      description:
        'Record a body measurement entry. Use this when the user provides body measurements ' +
        'like weight, body fat, or tape measurements.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Measurement date in YYYY-MM-DD format' },
          weight_kg: { type: 'number', description: 'Body weight in kg' },
          body_fat_pct: { type: 'number', description: 'Body fat percentage' },
          chest_cm: { type: 'number', description: 'Chest circumference in cm' },
          waist_cm: { type: 'number', description: 'Waist circumference in cm' },
          hips_cm: { type: 'number', description: 'Hips circumference in cm' },
          bicep_left_cm: { type: 'number', description: 'Left bicep circumference in cm' },
          bicep_right_cm: { type: 'number', description: 'Right bicep circumference in cm' },
          thigh_left_cm: { type: 'number', description: 'Left thigh circumference in cm' },
          thigh_right_cm: { type: 'number', description: 'Right thigh circumference in cm' },
          neck_cm: { type: 'number', description: 'Neck circumference in cm' },
          shoulders_cm: { type: 'number', description: 'Shoulders circumference in cm' },
          forearm_cm: { type: 'number', description: 'Forearm circumference in cm' },
          calf_cm: { type: 'number', description: 'Calf circumference in cm' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['date'],
      },
    },
  ] as Anthropic.Tool[];
}

// ---------- tool execution against local repositories ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
async function executeTool(
  name: string,
  input: any,
): Promise<{ resultText: string; action: ActionPerformed | null }> {
  try {
    if (name === 'create_exercise') {
      const ex = await createExercise({
        name: input.name,
        sets: input.sets,
        reps: input.reps,
        weight: input.weight ?? null,
        workout_day: input.workout_day ?? 'A',
      });
      if (input.notes) await updateExercise(ex.id, { notes: input.notes });
      return {
        resultText: JSON.stringify(ex),
        action: {
          action: 'create_exercise',
          description: `Added exercise: ${input.name} (${input.sets}x${input.reps})`,
          details: ex as any,
        },
      };
    }

    if (name === 'edit_exercise') {
      const { exercise_id, ...rest } = input;
      const ex = await updateExercise(exercise_id, rest);
      const changed = Object.entries(rest)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      return {
        resultText: JSON.stringify(ex),
        action: {
          action: 'edit_exercise',
          description: `Updated exercise #${exercise_id}: ${changed}`,
          details: ex as any,
        },
      };
    }

    if (name === 'log_workout') {
      const exercises = (input.exercises ?? []).map((e: any, i: number) => ({
        exercise_name: e.exercise_name,
        sets_completed: e.sets_completed,
        reps_completed: e.reps_completed,
        weight_used: e.weight_used ?? null,
        order: i,
      }));
      const sess = await createSession({
        date: input.date,
        workout_day: input.workout_day,
        notes: input.notes ?? null,
        duration_minutes: input.duration_minutes ?? null,
        exercises,
      });
      return {
        resultText: JSON.stringify(sess),
        action: {
          action: 'log_workout',
          description: `Logged workout on ${input.date} (day ${input.workout_day}, ${exercises.length} exercises)`,
          details: sess as any,
        },
      };
    }

    if (name === 'add_measurement') {
      const { date, notes, ...metrics } = input;
      const m = await createMeasurement({ date, notes: notes ?? null, ...metrics });
      const metricKeys = Object.keys(metrics).filter((k) => metrics[k] != null);
      return {
        resultText: JSON.stringify(m),
        action: {
          action: 'add_measurement',
          description: `Recorded measurements on ${date}: ${metricKeys.join(', ')}`,
          details: m as any,
        },
      };
    }

    return { resultText: JSON.stringify({ error: `Unknown tool: ${name}` }), action: null };
  } catch (e: any) {
    return { resultText: JSON.stringify({ error: String(e?.message ?? e) }), action: null };
  }
}

// ---------- chat ----------

export async function chatWithCoach(
  message: string,
  includeWorkoutContext = true,
  history?: ChatMessage[],
): Promise<ChatResponse> {
  const creds = await resolveCredentials();
  const client = makeClient(creds);
  const model = modelId(creds);

  let ctx: WorkoutContextData | null = null;
  if (includeWorkoutContext) {
    try {
      ctx = await buildWorkoutContext();
    } catch {
      ctx = null;
    }
  }

  const system = COACH_SYSTEM_PROMPT.replace('{today}', todayISO()) + formatWorkoutContext(ctx);
  const tools = buildCoachTools(ctx?.cycle_length ?? 7);
  const contextUsed = !!(ctx && ctx.exercises.length > 0);

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: 'user', content: message },
  ];
  const actions: ActionPerformed[] = [];

  for (let i = 0; i < MAX_ITERS; i++) {
    const resp = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system,
      messages,
      tools,
    });

    if (resp.stop_reason !== 'tool_use') {
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { response: text, context_used: contextUsed, actions_performed: actions };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of resp.content) {
      if (block.type === 'tool_use') {
        const { resultText, action } = await executeTool(block.name, block.input);
        if (action) actions.push(action);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: resultText });
      }
    }
    messages.push({ role: 'assistant', content: resp.content });
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    response: 'I performed several actions but reached the processing limit. Please check your data.',
    context_used: contextUsed,
    actions_performed: actions,
  };
}

// ---------- structured output helper ----------

async function structured<T>(
  client: Anthropic,
  model: string,
  system: string,
  userPrompt: string,
  toolName: string,
  schema: Anthropic.Tool.InputSchema,
): Promise<T> {
  const resp = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system,
    messages: [{ role: 'user', content: userPrompt }],
    tools: [{ name: toolName, description: `Return the ${toolName} result as structured data.`, input_schema: schema }],
    tool_choice: { type: 'tool', name: toolName },
  });
  const block = resp.content.find((b) => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
  if (!block) throw new Error('No structured output returned by the model');
  return block.input as T;
}

// ---------- recommendation ----------

const RECOMMENDATION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          sets: { type: 'integer' },
          reps: { type: 'string', description: "e.g. '8' or '8-12'" },
          weight_suggestion: { type: 'string' },
          notes: { type: 'string' },
          muscle_group: { type: 'string', enum: MUSCLE_GROUP_ENUM },
          workout_day: { type: 'string' },
        },
        required: ['name', 'sets', 'reps', 'muscle_group', 'workout_day'],
      },
    },
    estimated_duration_minutes: { type: 'integer' },
    difficulty: { type: 'string' },
    tips: { type: 'array', items: { type: 'string' } },
    split_type: { type: 'string' },
  },
  required: ['title', 'description', 'exercises', 'estimated_duration_minutes', 'difficulty', 'tips', 'split_type'],
} as unknown as Anthropic.Tool.InputSchema;

export async function getWorkoutRecommendation(
  request: RecommendationRequest = {},
): Promise<WorkoutRecommendation> {
  const creds = await resolveCredentials();
  const client = makeClient(creds);
  const model = modelId(creds);

  let ctx: WorkoutContextData | null = null;
  try {
    ctx = await buildWorkoutContext();
  } catch {
    ctx = null;
  }

  const focusLabel =
    request.custom_focus_area ||
    (request.focus_area ? request.focus_area.replace(/_/g, '/').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Full Body');
  const equip = request.equipment_available ?? ['barbell', 'dumbbells', 'cables', 'bodyweight'];
  const goalLabel = (request.training_goal ?? 'general_fitness').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const levelLabel = (request.experience_level ?? 'intermediate').replace(/\b\w/g, (c) => c.toUpperCase());
  const days = request.training_days_per_week ?? 3;
  const exPerSession = request.exercises_per_session ?? null;
  const sessionDuration = request.session_duration_minutes ?? 60;
  const lastDayLetter = String.fromCharCode(64 + days);

  const prompt = `Generate a complete, personalized workout routine.

Training Goal: ${goalLabel}
Experience Level: ${levelLabel}
Training Days Per Week: ${days}
Session Duration: ${sessionDuration} minutes per session
Focus Area: ${focusLabel}
Available Equipment: ONLY ${equip.join(', ')}

Create a full ${days}-day training program tailored to ${goalLabel.toLowerCase()}.

Requirements:
1. A catchy workout title reflecting the goal and split
2. Brief description explaining the program philosophy and why this split suits the goal
3. Generate exercises across all ${days} days — use workout days "A" through "${lastDayLetter}"
4. Each day should have ${exPerSession ? `exactly ${exPerSession} exercises` : '4-7 exercises'} appropriate for the split
5. Estimated session duration in minutes
6. Difficulty level matching ${levelLabel}
7. A split_type label (e.g. "Push/Pull/Legs", "Upper/Lower", "Full Body", "Bro Split", "Arnold Split")
8. 3-5 practical tips specific to ${goalLabel.toLowerCase()} training

STRICT equipment rule:
- ONLY use exercises that can be performed with: ${equip.join(', ')}
- Do NOT include exercises requiring equipment NOT in this list
- If "machines" is not listed, do NOT suggest any machine-based exercises
  (no cable machine, no leg press machine, no smith machine, etc.)
- Prefer free-weight and bodyweight alternatives when machines are unavailable

Goal-specific guidelines:
- Hypertrophy: 8-12 reps, moderate weight, 3-4 sets, focus on time under tension
- Strength: 3-6 reps, heavier weight, 4-5 sets, prioritize compound lifts
- Endurance: 15-20 reps, lighter weight, 2-3 sets, shorter rest periods
- Fat Loss: mix of compound movements, supersets, 10-15 reps, higher volume
- General Fitness: balanced approach, 8-12 reps, full-body coverage

Day assignment rules:
- MUST use workout days "A" through "${lastDayLetter}" — exactly ${days} days, no more, no less
- Distribute muscle groups logically across the ${days} days
- Each exercise reps field must be a string like "8" or "8-12"
- Each exercise muscle_group must be one of: ${MUSCLE_GROUP_ENUM.join(', ')}

If workout context is available, base weights on the user's current lifts.`;

  const system = COACH_SYSTEM_PROMPT.replace('{today}', todayISO()) + formatWorkoutContext(ctx);
  return structured<WorkoutRecommendation>(client, model, system, prompt, 'emit_recommendation', RECOMMENDATION_SCHEMA);
}

// ---------- progress analysis ----------

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    areas_to_improve: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    muscle_balance_score: { type: 'number', description: '0-100' },
  },
  required: ['summary', 'strengths', 'areas_to_improve', 'recommendations'],
} as unknown as Anthropic.Tool.InputSchema;

export async function getProgressAnalysis(): Promise<ProgressAnalysis> {
  const creds = await resolveCredentials();
  const client = makeClient(creds);
  const model = modelId(creds);

  const ctx = await buildWorkoutContext();
  if (!ctx.exercises.length) {
    throw new Error('No exercises found. Add some exercises to get analysis.');
  }

  const prompt = `Analyze the workout routine provided in the context and give personalized feedback.

IMPORTANT: Base your analysis ONLY on the specific exercises, workout split, and training structure
you see in the workout data. Do NOT provide generic advice.

Provide:
1. A brief summary of the training approach (mention the specific split type and structure you observe)
2. Identified strengths in THIS specific routine (be specific to the exercises and split shown)
3. Areas that need improvement (be specific to what's missing or imbalanced in THIS routine)
4. Specific, actionable recommendations (based on the actual exercises and gaps you see)
5. A muscle balance score (0-100) based on how well-rounded THIS specific routine is

Be encouraging but honest. Focus on practical improvements specific to this person's actual workout.`;

  const system = COACH_SYSTEM_PROMPT.replace('{today}', todayISO()) + formatWorkoutContext(ctx);
  return structured<ProgressAnalysis>(client, model, system, prompt, 'emit_analysis', ANALYSIS_SCHEMA);
}

// ---------- progressive overload ----------

const OVERLOAD_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          exercise_name: { type: 'string' },
          current_weight: { type: 'number' },
          suggested_weight: { type: 'number' },
          current_volume: { type: 'string' },
          suggested_volume: { type: 'string' },
          readiness: {
            type: 'string',
            enum: ['ready_to_increase', 'maintaining', 'needs_more_data', 'deload_suggested'],
          },
          reasoning: { type: 'string' },
          sessions_at_current: { type: 'integer' },
        },
        required: ['exercise_name', 'readiness', 'reasoning'],
      },
    },
    general_tips: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'suggestions', 'general_tips'],
} as unknown as Anthropic.Tool.InputSchema;

export async function getOverloadSuggestions(exerciseNames?: string[]): Promise<OverloadSuggestions> {
  const creds = await resolveCredentials();
  const client = makeClient(creds);
  const model = modelId(creds);

  const { ctx, weightProgress, volumeProgress } = await buildOverloadContext(exerciseNames);
  if (!ctx.exercises.length) {
    throw new Error('No exercises found. Add exercises to get overload suggestions.');
  }

  // Split exercises into those with logged history vs. those without.
  const weightExercises = weightProgress.exercises ?? {};
  const exercisesWithData: string[] = [];
  const noDataSuggestions: ExerciseOverloadSuggestion[] = [];
  for (const ex of ctx.exercises) {
    const points = weightExercises[ex.name] ?? [];
    if (points.length >= 1) {
      exercisesWithData.push(ex.name);
    } else {
      noDataSuggestions.push({
        exercise_name: ex.name,
        readiness: 'needs_more_data',
        reasoning: 'No logged sessions yet. Start logging workouts to get recommendations.',
      });
    }
  }

  if (exercisesWithData.length === 0) {
    return {
      summary: 'Not enough workout history to analyze. Log some sessions first!',
      suggestions: noDataSuggestions,
      general_tips: ['Log at least 3 sessions per exercise to get meaningful overload recommendations.'],
    };
  }

  // Truncate to last 20 points per exercise with data.
  const truncate = (prog: { metric?: string; exercises: Record<string, { date: string; value: number }[]> }) => ({
    metric: prog.metric ?? '',
    exercises: Object.fromEntries(
      Object.entries(prog.exercises ?? {})
        .filter(([name]) => exercisesWithData.includes(name))
        .map(([name, pts]) => [name, pts.slice(-20)]),
    ),
  });

  const weightData = truncate(weightProgress);
  const volumeData = truncate(volumeProgress);

  const prompt = `Analyze the following workout history and provide progressive overload recommendations
for each exercise listed below.

## Weight Progress (per exercise, chronological)
${JSON.stringify(weightData, null, 2)}

## Volume Progress (per exercise, chronological — value = sets × reps × weight)
${JSON.stringify(volumeData, null, 2)}

## Instructions
For EACH exercise in the data above, analyze its weight and volume time series and provide
a recommendation:

1. **ready_to_increase** — The user has performed 3+ sessions at the same weight with consistent
   reps. Suggest a specific weight increase:
   - Compound lifts (squat, bench, deadlift, row, press): increase by 2.5–5 kg
   - Isolation lifts (curl, extension, fly, raise): increase by 1–2.5 kg
   - Also suggest volume increases (extra set or reps) if appropriate

2. **maintaining** — The user is progressing steadily and should continue current programming.
   No change needed yet.

3. **needs_more_data** — Fewer than 3 logged sessions for this exercise. Cannot make a reliable
   recommendation yet.

4. **deload_suggested** — Weight or volume has been declining over recent sessions, suggesting
   fatigue or overreaching. Suggest reducing weight by 10-15%.

Be specific with numbers. All weights are in kg. Include the number of sessions at current weight.
Focus on practical, conservative recommendations. Do NOT suggest increases if the user has only
done 1-2 sessions at a weight — they need consistency first.

ONLY include exercises that appear in the progress data above. Do not invent exercises.`;

  const system = COACH_SYSTEM_PROMPT.replace('{today}', todayISO()) + formatWorkoutContext(ctx);
  const result = await structured<OverloadSuggestions>(
    client, model, system, prompt, 'emit_overload', OVERLOAD_SCHEMA,
  );
  result.suggestions = [...(result.suggestions ?? []), ...noDataSuggestions];
  return result;
}
