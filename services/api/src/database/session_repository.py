"""Repository for workout session operations.

Provides CRUD for logged workout sessions and derived analytics
(streaks, progress). All queries scoped by user_id.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import func
from sqlmodel import Session, select

from services.api.src.database.db_models import SessionExerciseTable, WorkoutSessionTable
from services.shared.models.session import (
    ExerciseProgressResponse,
    ProgressPoint,
    SessionExerciseResponse,
    StreakResponse,
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutSessionSummary,
)


class WorkoutSessionRepository:
    """Repository for workout session CRUD and analytics."""

    def __init__(self, session: Session):
        self.session = session

    def create_session(self, user_id: int, data: WorkoutSessionCreate) -> WorkoutSessionResponse:
        """Log a completed workout, merging into an existing session for the same day+workout_day."""
        # Find existing session for this date + workout_day
        stmt = select(WorkoutSessionTable).where(
            WorkoutSessionTable.user_id == user_id,
            WorkoutSessionTable.workout_date == data.date,
            WorkoutSessionTable.workout_day == data.workout_day,
        )
        db_session = self.session.exec(stmt).first()

        if db_session:
            # Update notes/duration if provided
            if data.notes is not None:
                db_session.notes = data.notes
            if data.duration_minutes is not None:
                db_session.duration_minutes = data.duration_minutes
        else:
            db_session = WorkoutSessionTable(
                user_id=user_id,
                workout_date=data.date,
                workout_day=data.workout_day,
                notes=data.notes,
                duration_minutes=data.duration_minutes,
            )
            self.session.add(db_session)
            self.session.flush()

        # Upsert exercises
        for ex in data.exercises:
            ex_stmt = select(SessionExerciseTable).where(
                SessionExerciseTable.session_id == db_session.id,
                func.lower(SessionExerciseTable.exercise_name) == ex.exercise_name.lower(),
            )
            db_ex = self.session.exec(ex_stmt).first()
            if db_ex:
                db_ex.sets_completed = ex.sets_completed
                db_ex.reps_completed = ex.reps_completed
                db_ex.weight_used = ex.weight_used
                db_ex.one_rep_max = ex.one_rep_max
                db_ex.order = ex.order
            else:
                db_ex = SessionExerciseTable(
                    session_id=db_session.id,
                    exercise_name=ex.exercise_name,
                    sets_completed=ex.sets_completed,
                    reps_completed=ex.reps_completed,
                    weight_used=ex.weight_used,
                    one_rep_max=ex.one_rep_max,
                    order=ex.order,
                )
                self.session.add(db_ex)

        self.session.commit()
        self.session.refresh(db_session)

        # Fetch all exercises for the response
        all_ex_stmt = (
            select(SessionExerciseTable)
            .where(SessionExerciseTable.session_id == db_session.id)
            .order_by(SessionExerciseTable.order)
        )
        all_exercises = self.session.exec(all_ex_stmt).all()

        return WorkoutSessionResponse(
            id=db_session.id,
            date=db_session.workout_date,
            workout_day=db_session.workout_day,
            notes=db_session.notes,
            duration_minutes=db_session.duration_minutes,
            created_at=db_session.created_at,
            exercises=[SessionExerciseResponse.model_validate(ex) for ex in all_exercises],
        )

    def auto_log_exercise(
        self,
        user_id: int,
        exercise_name: str,
        workout_day: str,
        sets: int,
        reps: int,
        weight: float | None,
    ) -> None:
        """Auto-log an exercise update into today's session.

        Finds or creates a session for today + workout_day, then upserts
        the exercise entry so repeated edits don't create duplicates.
        """
        today = date.today()

        # Find existing session for today + workout_day
        stmt = select(WorkoutSessionTable).where(
            WorkoutSessionTable.user_id == user_id,
            WorkoutSessionTable.workout_date == today,
            WorkoutSessionTable.workout_day == workout_day,
        )
        db_session = self.session.exec(stmt).first()

        if not db_session:
            db_session = WorkoutSessionTable(
                user_id=user_id,
                workout_date=today,
                workout_day=workout_day,
            )
            self.session.add(db_session)
            self.session.flush()

        # Find existing exercise entry in this session
        ex_stmt = select(SessionExerciseTable).where(
            SessionExerciseTable.session_id == db_session.id,
            func.lower(SessionExerciseTable.exercise_name) == exercise_name.lower(),
        )
        db_ex = self.session.exec(ex_stmt).first()

        if db_ex:
            db_ex.sets_completed = sets
            db_ex.reps_completed = reps
            db_ex.weight_used = weight
        else:
            # Determine order: next after existing exercises
            count_stmt = select(func.count()).where(SessionExerciseTable.session_id == db_session.id)
            count = self.session.exec(count_stmt).one()
            db_ex = SessionExerciseTable(
                session_id=db_session.id,
                exercise_name=exercise_name,
                sets_completed=sets,
                reps_completed=reps,
                weight_used=weight,
                order=count,
            )
            self.session.add(db_ex)

        self.session.commit()

    def update_session(
        self, session_id: int, user_id: int, data: WorkoutSessionCreate
    ) -> WorkoutSessionResponse | None:
        """Replace a session's data (date, day, notes, duration, exercises)."""
        stmt = select(WorkoutSessionTable).where(
            WorkoutSessionTable.id == session_id,
            WorkoutSessionTable.user_id == user_id,
        )
        db_session = self.session.exec(stmt).first()
        if not db_session:
            return None

        # Update session fields
        db_session.workout_date = data.date
        db_session.workout_day = data.workout_day
        db_session.notes = data.notes
        db_session.duration_minutes = data.duration_minutes

        # Delete old exercises
        old_ex_stmt = select(SessionExerciseTable).where(SessionExerciseTable.session_id == session_id)
        for ex in self.session.exec(old_ex_stmt).all():
            self.session.delete(ex)

        # Add new exercises
        db_exercises = []
        for ex in data.exercises:
            db_ex = SessionExerciseTable(
                session_id=session_id,
                exercise_name=ex.exercise_name,
                sets_completed=ex.sets_completed,
                reps_completed=ex.reps_completed,
                weight_used=ex.weight_used,
                one_rep_max=ex.one_rep_max,
                order=ex.order,
            )
            self.session.add(db_ex)
            db_exercises.append(db_ex)

        self.session.commit()
        self.session.refresh(db_session)
        for ex in db_exercises:
            self.session.refresh(ex)

        return WorkoutSessionResponse(
            id=db_session.id,
            date=db_session.workout_date,
            workout_day=db_session.workout_day,
            notes=db_session.notes,
            duration_minutes=db_session.duration_minutes,
            created_at=db_session.created_at,
            exercises=[SessionExerciseResponse.model_validate(ex) for ex in db_exercises],
        )

    def get_session(self, session_id: int, user_id: int) -> WorkoutSessionResponse | None:
        """Get a session with its exercises."""
        stmt = select(WorkoutSessionTable).where(
            WorkoutSessionTable.id == session_id,
            WorkoutSessionTable.user_id == user_id,
        )
        db_session = self.session.exec(stmt).first()
        if not db_session:
            return None

        ex_stmt = (
            select(SessionExerciseTable)
            .where(SessionExerciseTable.session_id == session_id)
            .order_by(SessionExerciseTable.order)
        )
        exercises = self.session.exec(ex_stmt).all()

        return WorkoutSessionResponse(
            id=db_session.id,
            date=db_session.workout_date,
            workout_day=db_session.workout_day,
            notes=db_session.notes,
            duration_minutes=db_session.duration_minutes,
            created_at=db_session.created_at,
            exercises=[SessionExerciseResponse.model_validate(ex) for ex in exercises],
        )

    def delete_session(self, session_id: int, user_id: int) -> bool:
        """Delete a session and its exercises."""
        stmt = select(WorkoutSessionTable).where(
            WorkoutSessionTable.id == session_id,
            WorkoutSessionTable.user_id == user_id,
        )
        db_session = self.session.exec(stmt).first()
        if not db_session:
            return False

        # Delete exercises first
        ex_stmt = select(SessionExerciseTable).where(SessionExerciseTable.session_id == session_id)
        for ex in self.session.exec(ex_stmt).all():
            self.session.delete(ex)

        self.session.delete(db_session)
        self.session.commit()
        return True

    def list_sessions_by_month(self, user_id: int, year: int, month: int) -> list[WorkoutSessionSummary]:
        """List session summaries for a calendar month."""
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)

        # Single query: aggregate exercise stats per session
        stmt = (
            select(
                WorkoutSessionTable.id,
                WorkoutSessionTable.workout_date,
                WorkoutSessionTable.workout_day,
                func.count(SessionExerciseTable.id).label("exercise_count"),
                func.coalesce(
                    func.sum(
                        SessionExerciseTable.sets_completed
                        * SessionExerciseTable.reps_completed
                        * func.coalesce(SessionExerciseTable.weight_used, 0)
                    ),
                    0,
                ).label("total_volume"),
            )
            .outerjoin(SessionExerciseTable, SessionExerciseTable.session_id == WorkoutSessionTable.id)
            .where(
                WorkoutSessionTable.user_id == user_id,
                WorkoutSessionTable.workout_date >= start,
                WorkoutSessionTable.workout_date < end,
            )
            .group_by(WorkoutSessionTable.id, WorkoutSessionTable.workout_date, WorkoutSessionTable.workout_day)
            .order_by(WorkoutSessionTable.workout_date)
        )
        rows = self.session.exec(stmt).all()

        return [
            WorkoutSessionSummary(
                id=row.id,
                date=row.workout_date,
                workout_day=row.workout_day,
                exercise_count=row.exercise_count,
                total_volume=float(row.total_volume),
            )
            for row in rows
        ]

    def get_streak(self, user_id: int) -> StreakResponse:
        """Calculate current and best workout streaks."""
        # Single query: all distinct workout dates in ascending order
        stmt = (
            select(func.distinct(WorkoutSessionTable.workout_date))
            .where(WorkoutSessionTable.user_id == user_id)
            .order_by(WorkoutSessionTable.workout_date)
        )
        all_dates: list[date] = list(self.session.exec(stmt).all())

        total_workouts = len(all_dates)
        if not all_dates:
            return StreakResponse(current_streak=0, best_streak=0, total_workouts=0, last_workout_date=None)

        last_workout_date = all_dates[-1]
        today = date.today()

        # Current streak: walk backwards from today/last_workout_date
        current_streak = 0
        if last_workout_date >= today - timedelta(days=1):
            date_set = set(all_dates)
            check_date = min(today, last_workout_date)
            while check_date in date_set:
                current_streak += 1
                check_date -= timedelta(days=1)

        # Best streak: scan consecutive dates
        best_streak = 1
        run = 1
        for i in range(1, len(all_dates)):
            if all_dates[i] - all_dates[i - 1] == timedelta(days=1):
                run += 1
                best_streak = max(best_streak, run)
            else:
                run = 1

        best_streak = max(best_streak, current_streak)

        return StreakResponse(
            current_streak=current_streak,
            best_streak=best_streak,
            total_workouts=total_workouts,
            last_workout_date=last_workout_date,
        )

    def get_exercise_progress(
        self, user_id: int, exercise_name: str, metric: str = "weight"
    ) -> ExerciseProgressResponse:
        """Get time series data for an exercise's progress.

        Metrics:
            weight — max weight_used per session date
            volume — total volume (sets × reps × weight) per session date
            one_rep_max — max one_rep_max entry per session date
        """
        stmt = (
            select(WorkoutSessionTable.workout_date, SessionExerciseTable)
            .join(SessionExerciseTable, SessionExerciseTable.session_id == WorkoutSessionTable.id)
            .where(
                WorkoutSessionTable.user_id == user_id,
                func.lower(SessionExerciseTable.exercise_name) == exercise_name.lower(),
            )
            .order_by(WorkoutSessionTable.workout_date)
        )
        rows = self.session.exec(stmt).all()

        # Group by date
        date_data: dict[date, list[SessionExerciseTable]] = {}
        for session_date, ex in rows:
            date_data.setdefault(session_date, []).append(ex)

        points: list[ProgressPoint] = []
        for d in sorted(date_data.keys()):
            exercises = date_data[d]
            if metric == "weight":
                value = max((ex.weight_used or 0) for ex in exercises)
            elif metric == "volume":
                value = sum(ex.sets_completed * ex.reps_completed * (ex.weight_used or 0) for ex in exercises)
            elif metric == "one_rep_max":
                value = max((ex.one_rep_max or 0) for ex in exercises)
            else:
                value = 0
            if value > 0:
                points.append(ProgressPoint(date=d, value=value))

        return ExerciseProgressResponse(
            exercise_name=exercise_name,
            metric=metric,
            data=points,
        )
