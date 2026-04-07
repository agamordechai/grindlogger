"""SQLModel database table definitions for Workout Tracker.

This module defines the database tables using SQLModel ORM.
Separate from Pydantic models to maintain clear separation between
database layer and API layer.
"""

import datetime as dt
from enum import Enum

from sqlmodel import Field, SQLModel


class SetType(str, Enum):
    """Classification for individual sets within an exercise."""

    NORMAL = "normal"
    WARM_UP = "warm_up"
    DROP_SET = "drop_set"
    AMRAP = "amrap"
    FAILURE = "failure"


class UserTable(SQLModel, table=True):
    """User database table model.

    Attributes:
        id: Auto-incrementing primary key
        google_id: Unique Google OAuth subject ID (None for email/password users)
        email: Unique user email
        name: User display name
        password_hash: Bcrypt hash of password (None for Google OAuth users)
        picture_url: User profile picture URL from Google
        role: User role (default 'user')
        disabled: Whether account is disabled
        created_at: Account creation timestamp
    """

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    google_id: str | None = Field(default=None, unique=True, index=True, max_length=255)
    github_id: str | None = Field(default=None, unique=True, index=True, max_length=255)
    discord_id: str | None = Field(default=None, unique=True, index=True, max_length=255)
    reddit_id: str | None = Field(default=None, unique=True, index=True, max_length=255)
    email: str = Field(unique=True, index=True, max_length=255)
    name: str = Field(max_length=255)
    password_hash: str | None = Field(default=None, max_length=255)
    picture_url: str | None = Field(default=None, max_length=1024)
    role: str = Field(default="user", max_length=20)
    disabled: bool = Field(default=False)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))

    # Google Calendar sync
    google_calendar_refresh_token: str | None = Field(default=None, max_length=2048)
    google_calendar_id: str | None = Field(default=None, max_length=255)
    google_calendar_enabled: bool = Field(default=False)


class BodyMeasurementTable(SQLModel, table=True):
    """Body measurement entry — tracks weight, body fat %, and tape measurements over time."""

    __tablename__ = "body_measurements"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    measurement_date: dt.date = Field(index=True)
    weight_kg: float | None = Field(default=None, ge=0)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    chest_cm: float | None = Field(default=None, ge=0)
    waist_cm: float | None = Field(default=None, ge=0)
    hips_cm: float | None = Field(default=None, ge=0)
    bicep_left_cm: float | None = Field(default=None, ge=0)
    bicep_right_cm: float | None = Field(default=None, ge=0)
    thigh_left_cm: float | None = Field(default=None, ge=0)
    thigh_right_cm: float | None = Field(default=None, ge=0)
    neck_cm: float | None = Field(default=None, ge=0)
    shoulders_cm: float | None = Field(default=None, ge=0)
    forearm_cm: float | None = Field(default=None, ge=0)
    calf_cm: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=500)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))


class ExerciseTable(SQLModel, table=True):
    """Exercise database table model.

    This SQLModel class represents the 'exercises' table in the database.
    It uses SQLModel which combines SQLAlchemy ORM with Pydantic validation.

    Attributes:
        id: Auto-incrementing primary key
        name: Exercise name (required, max 100 chars)
        sets: Number of sets (required, 1-100)
        reps: Number of repetitions (required, 1-1000)
        weight: Weight in kg (optional for bodyweight exercises)
        workout_day: Workout day identifier (A-G or 'None')
        user_id: Foreign key to users table
    """

    __tablename__ = "exercises"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, index=True)
    sets: int = Field(ge=1, le=100)
    reps: int = Field(ge=1, le=1000)
    weight: float | None = Field(default=None, ge=0)
    workout_day: str = Field(default="A", max_length=10)
    notes: str | None = Field(default=None, max_length=500)
    user_id: int = Field(foreign_key="users.id", index=True)
    archived: bool = Field(default=False, index=True)
    sort_order: int = Field(default=0, ge=0)
    superset_group: int | None = Field(default=None)


class WorkoutSessionTable(SQLModel, table=True):
    """Logged workout session — records that a user completed a workout on a given date."""

    __tablename__ = "workout_sessions"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    workout_date: dt.date = Field(index=True)
    workout_day: str = Field(max_length=10)
    notes: str | None = Field(default=None, max_length=1000)
    duration_minutes: int | None = Field(default=None, ge=0)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))
    google_calendar_event_id: str | None = Field(default=None, max_length=1024)


class SessionExerciseTable(SQLModel, table=True):
    """Individual exercise performed within a workout session."""

    __tablename__ = "session_exercises"

    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="workout_sessions.id", index=True)
    exercise_name: str = Field(max_length=100)
    sets_completed: int = Field(ge=0, le=100)
    reps_completed: int = Field(ge=0, le=1000)
    weight_used: float | None = Field(default=None, ge=0)
    one_rep_max: float | None = Field(default=None, ge=0)
    order: int = Field(default=0, ge=0)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))


class SetDetailTable(SQLModel, table=True):
    """Individual set performed within a session exercise."""

    __tablename__ = "set_details"

    id: int | None = Field(default=None, primary_key=True)
    session_exercise_id: int = Field(foreign_key="session_exercises.id", index=True)
    set_number: int = Field(ge=1, le=100)
    reps: int = Field(ge=0, le=1000)
    weight: float | None = Field(default=None, ge=0)
    set_type: str = Field(default=SetType.NORMAL, max_length=20)
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))
