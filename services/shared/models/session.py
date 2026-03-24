"""Workout session models for logging completed workouts.

These models represent actual performed workouts (as opposed to the planned
exercises in exercise.py). Used for history, calendar, streaks, and progress tracking.
"""

from datetime import date, datetime

from pydantic import BaseModel, Field


class SessionExerciseCreate(BaseModel):
    """An exercise performed within a session."""

    exercise_name: str = Field(..., min_length=1, max_length=100)
    sets_completed: int = Field(..., ge=0, le=100)
    reps_completed: int = Field(..., ge=0, le=1000)
    weight_used: float | None = Field(default=None, ge=0)
    one_rep_max: float | None = Field(default=None, ge=0)
    order: int = Field(default=0, ge=0)


class SessionExerciseResponse(SessionExerciseCreate):
    """Session exercise with database ID."""

    id: int

    model_config = {"from_attributes": True}


class WorkoutSessionCreate(BaseModel):
    """Request body for logging a completed workout."""

    date: date
    workout_day: str = Field(..., min_length=1, max_length=10)
    notes: str | None = Field(default=None, max_length=1000)
    duration_minutes: int | None = Field(default=None, ge=0)
    exercises: list[SessionExerciseCreate] = Field(default_factory=list)


class WorkoutSessionResponse(BaseModel):
    """Full session detail with exercises."""

    id: int
    date: date
    workout_day: str
    notes: str | None
    duration_minutes: int | None
    created_at: datetime
    exercises: list[SessionExerciseResponse]

    model_config = {"from_attributes": True}


class WorkoutSessionSummary(BaseModel):
    """Lightweight session info for calendar view."""

    id: int
    date: date
    workout_day: str
    exercise_count: int
    total_volume: float


class StreakResponse(BaseModel):
    """Streak statistics derived from workout history."""

    current_streak: int
    best_streak: int
    total_workouts: int
    last_workout_date: date | None


class ProgressPoint(BaseModel):
    """Single data point for progress charts."""

    date: date
    value: float


class ExerciseProgressResponse(BaseModel):
    """Time series data for an exercise's progress."""

    exercise_name: str
    metric: str
    data: list[ProgressPoint]
