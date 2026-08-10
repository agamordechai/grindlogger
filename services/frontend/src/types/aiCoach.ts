/**
 * TypeScript types for AI Coach service
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs';

export interface ChatRequest {
  message: string;
  include_workout_context: boolean;
  history?: ChatMessage[];
}

export interface ActionPerformed {
  action: string;
  description: string;
  details: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  context_used: boolean;
  actions_performed: ActionPerformed[];
}

export interface RecommendationRequest {
  focus_area?: MuscleGroup;
  custom_focus_area?: string;
  equipment_available?: string[];
  session_duration_minutes?: number;
  training_goal?: string;
  training_days_per_week?: number;
  experience_level?: string;
  exercises_per_session?: number;
}

export interface ExerciseRecommendation {
  name: string;
  sets: number;
  reps: string;
  weight_suggestion?: string;
  notes?: string;
  muscle_group: MuscleGroup;
  workout_day: string;
}

export interface WorkoutRecommendation {
  title: string;
  description: string;
  exercises: ExerciseRecommendation[];
  estimated_duration_minutes: number;
  difficulty: string;
  tips: string[];
  split_type: string;
}

export interface ProgressAnalysis {
  summary: string;
  strengths: string[];
  areas_to_improve: string[];
  recommendations: string[];
  muscle_balance_score?: number;
}

export type ReadinessStatus = 'ready_to_increase' | 'maintaining' | 'needs_more_data' | 'deload_suggested';

export interface ExerciseOverloadSuggestion {
  exercise_name: string;
  current_weight?: number;
  suggested_weight?: number;
  current_volume?: string;
  suggested_volume?: string;
  readiness: ReadinessStatus;
  reasoning: string;
  sessions_at_current?: number;
}

export interface OverloadSuggestions {
  summary: string;
  suggestions: ExerciseOverloadSuggestion[];
  general_tips: string[];
}

export interface AICoachHealthResponse {
  status: string;
  service: string;
  ai_model: string;
  workout_api_connected: boolean;
  redis_connected: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Data URLs (data:image/jpeg;base64,...) attached by the user, if any. */
  images?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

