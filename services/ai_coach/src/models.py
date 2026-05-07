"""Pydantic models for the AI Coach service."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

# Import shared Exercise models
from services.shared.models import ExerciseResponse

# Alias for backward compatibility
ExerciseFromAPI = ExerciseResponse


class ActionPerformed(BaseModel):
    """An action the AI coach performed on behalf of the user."""

    action: str = Field(..., description="Action type: create_exercise, edit_exercise, log_workout, add_measurement")
    description: str = Field(..., description="Human-readable summary of what was done")
    details: dict[str, Any] = Field(default_factory=dict, description="API response data")


class MuscleGroup(str, Enum):
    """Muscle groups for workout categorization."""

    CHEST = "chest"
    BACK = "back"
    SHOULDERS = "shoulders"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    LEGS = "legs"
    CORE = "core"
    FULL_BODY = "full_body"
    UPPER_LOWER = "upper_lower"
    PUSH_PULL_LEGS = "push_pull_legs"


class RecentSession(BaseModel):
    """Lightweight session info for gap analysis."""

    date: str = Field(..., description="Session date in YYYY-MM-DD format")
    workout_day: str = Field(..., description="Which workout day was performed (A, B, C, ...)")
    exercise_count: int = Field(default=0)
    total_volume: float = Field(default=0.0)


class WorkoutContext(BaseModel):
    """Context for AI recommendations based on current workout data."""

    exercises: list[ExerciseFromAPI] = Field(default_factory=list)
    total_volume: float = Field(default=0.0, description="Total workout volume in kg")
    exercise_count: int = Field(default=0, description="Total number of exercises")
    muscle_groups_worked: list[str] = Field(default_factory=list)
    recent_sessions: list[RecentSession] = Field(
        default_factory=list, description="Sessions from the last two months for gap analysis"
    )


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request for chat endpoint."""

    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    include_workout_context: bool = Field(default=True, description="Include current workout data")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Prior conversation messages for multi-turn context",
    )


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    response: str = Field(..., description="AI coach response")
    context_used: bool = Field(..., description="Whether workout context was included")
    actions_performed: list[ActionPerformed] = Field(
        default_factory=list, description="Actions the coach performed on behalf of the user"
    )


class RecommendationRequest(BaseModel):
    """Request for workout recommendations."""

    focus_area: MuscleGroup | None = Field(default=None, description="Target muscle group")
    custom_focus_area: str | None = Field(
        default=None, max_length=200, description="Freeform focus area (overrides focus_area when set)"
    )
    equipment_available: list[str] = Field(
        default_factory=lambda: ["barbell", "dumbbells", "cables", "bodyweight"], description="Available equipment"
    )
    session_duration_minutes: int = Field(default=60, ge=5, le=180, description="Workout duration per session")
    training_goal: str | None = Field(
        default=None,
        description="Primary training goal: hypertrophy, strength, endurance, fat_loss, general_fitness",
    )
    training_days_per_week: int | None = Field(
        default=None, ge=2, le=7, description="How many days per week the user can train"
    )
    experience_level: str | None = Field(
        default=None,
        description="Experience level: beginner, intermediate, advanced",
    )
    exercises_per_session: int | None = Field(
        default=None, ge=3, le=10, description="Target number of exercises per workout day"
    )


class ExerciseRecommendation(BaseModel):
    """A single exercise recommendation."""

    name: str = Field(..., description="Exercise name")
    sets: int = Field(..., ge=1, le=10, description="Recommended sets")
    reps: str = Field(..., description="Recommended reps (can be range like '8-12')")
    weight_suggestion: str | None = Field(default=None, description="Weight suggestion")
    notes: str | None = Field(default=None, description="Form tips or notes")
    muscle_group: MuscleGroup = Field(..., description="Primary muscle group")
    workout_day: str = Field(default="A", description="Workout day assignment (A, B, C, etc.)")


class WorkoutRecommendation(BaseModel):
    """Full workout recommendation."""

    title: str = Field(..., description="Workout title")
    description: str = Field(..., description="Workout description")
    exercises: list[ExerciseRecommendation] = Field(..., description="Recommended exercises")
    estimated_duration_minutes: int = Field(..., description="Estimated duration")
    difficulty: str = Field(..., description="Workout difficulty level")
    tips: list[str] = Field(default_factory=list, description="General workout tips")
    split_type: str = Field(
        default="Single Session", description="Split structure, e.g. 'Push/Pull/Legs', 'A/B Upper-Lower', 'Full Body'"
    )


class ProgressAnalysis(BaseModel):
    """Analysis of workout progress."""

    summary: str = Field(..., description="Progress summary")
    strengths: list[str] = Field(default_factory=list, description="Training strengths")
    areas_to_improve: list[str] = Field(default_factory=list, description="Areas needing attention")
    recommendations: list[str] = Field(default_factory=list, description="Actionable recommendations")
    muscle_balance_score: float | None = Field(default=None, ge=0, le=100, description="Balance score")


class ReadinessStatus(str, Enum):
    """How ready an exercise is for progressive overload."""

    READY_TO_INCREASE = "ready_to_increase"
    MAINTAINING = "maintaining"
    NEEDS_MORE_DATA = "needs_more_data"
    DELOAD_SUGGESTED = "deload_suggested"


class ExerciseOverloadSuggestion(BaseModel):
    """Progressive overload recommendation for a single exercise."""

    exercise_name: str = Field(..., description="Name of the exercise")
    current_weight: float | None = Field(default=None, description="Current working weight in kg")
    suggested_weight: float | None = Field(default=None, description="Suggested new weight in kg")
    current_volume: str | None = Field(default=None, description="Current sets x reps summary")
    suggested_volume: str | None = Field(default=None, description="Suggested new sets x reps")
    readiness: ReadinessStatus = Field(..., description="Readiness to increase")
    reasoning: str = Field(..., description="Brief explanation of the recommendation")
    sessions_at_current: int | None = Field(default=None, description="Sessions at current weight/volume")


class OverloadRequest(BaseModel):
    """Optional filters for overload suggestions."""

    exercise_names: list[str] | None = Field(
        default=None, description="Specific exercises to analyze (None = all active exercises)"
    )


class OverloadSuggestions(BaseModel):
    """AI-generated progressive overload recommendations."""

    summary: str = Field(..., description="Overall progressive overload assessment")
    suggestions: list[ExerciseOverloadSuggestion] = Field(default_factory=list)
    general_tips: list[str] = Field(default_factory=list, description="General progressive overload tips")


class Conversation(BaseModel):
    """A stored conversation."""

    id: str = Field(..., description="Conversation ID")
    title: str = Field(default="New Chat", description="Auto-generated title from first user message")
    messages: list[ChatMessage] = Field(default_factory=list)
    created_at: str = Field(..., description="ISO timestamp")
    updated_at: str = Field(..., description="ISO timestamp")


class ConversationSummary(BaseModel):
    """Lightweight conversation metadata for listing."""

    id: str = Field(..., description="Conversation ID")
    title: str = Field(default="New Chat")
    message_count: int = Field(default=0)
    updated_at: str = Field(..., description="ISO timestamp")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    service: str = Field(default="ai-coach", description="Service name")
    ai_model: str = Field(..., description="AI model being used")
    workout_api_connected: bool = Field(..., description="Workout API connection status")
    redis_connected: bool = Field(..., description="Redis connection status")
