"""HTTP client for communicating with the GrindLogger API."""

import asyncio
import logging
from typing import Any

import httpx

from services.ai_coach.src.config import get_settings
from services.ai_coach.src.models import ExerciseFromAPI, RecentSession, WorkoutContext

logger = logging.getLogger(__name__)


class WorkoutAPIClient:
    """Client for the GrindLogger API."""

    def __init__(self, base_url: str | None = None, timeout: float = 10.0):
        """Initialize the API client.

        Args:
            base_url: Base URL of the Workout API
            timeout: Request timeout in seconds
        """
        settings = get_settings()
        self.base_url = base_url or settings.workout_api_url
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def health_check(self) -> bool:
        """Check if the Workout API is healthy.

        Returns:
            True if API is healthy, False otherwise
        """
        try:
            client = await self._get_client()
            response = await client.get("/health")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Workout API health check failed: {e}")
            return False

    async def get_exercises(self, auth_header: str | None = None) -> list[ExerciseFromAPI]:
        """Fetch all exercises from the Workout API.

        Args:
            auth_header: Authorization header value to forward (e.g. 'Bearer xxx')

        Returns:
            List of exercises
        """
        try:
            client = await self._get_client()
            headers = {}
            if auth_header:
                headers["Authorization"] = auth_header
            response = await client.get("/exercises?page_size=200", headers=headers)
            response.raise_for_status()
            data = response.json()

            # API returns paginated response: {'items': [...], 'page': 1, 'page_size': 20, 'total': N}
            if isinstance(data, dict) and "items" in data:
                return [ExerciseFromAPI(**ex) for ex in data["items"]]
            else:
                # Fallback for legacy non-paginated response
                return [ExerciseFromAPI(**ex) for ex in data]
        except Exception as e:
            logger.error(f"Failed to fetch exercises: {e}")
            return []

    async def get_recent_sessions(self, auth_header: str | None = None) -> list[RecentSession]:
        """Fetch sessions from the current and previous month for gap analysis."""
        from datetime import date

        today = date.today()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header

        client = await self._get_client()

        async def _fetch_month(year: int, month: int) -> list[dict]:
            try:
                response = await client.get(f"/sessions/calendar?year={year}&month={month}", headers=headers)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.warning(f"Failed to fetch sessions for {year}-{month:02d}: {e}")
                return []

        prev_month = today.month - 1 or 12
        prev_year = today.year if today.month > 1 else today.year - 1

        this_month_data, prev_month_data = await asyncio.gather(
            _fetch_month(today.year, today.month),
            _fetch_month(prev_year, prev_month),
        )

        sessions = []
        for raw in sorted(this_month_data + prev_month_data, key=lambda s: s["date"]):
            sessions.append(
                RecentSession(
                    date=raw["date"],
                    workout_day=raw["workout_day"],
                    exercise_count=raw.get("exercise_count", 0),
                    total_volume=raw.get("total_volume", 0.0),
                )
            )
        return sessions

    async def get_user_profile(self, auth_header: str | None = None) -> dict[str, Any] | None:
        """Fetch current user's profile from the main API."""
        try:
            client = await self._get_client()
            headers = {}
            if auth_header:
                headers["Authorization"] = auth_header
            response = await client.get("/auth/me", headers=headers)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.warning(f"Failed to fetch user profile: {e}")
            return None

    async def get_workout_context(self, auth_header: str | None = None) -> WorkoutContext:
        """Build workout context from current exercises and recent session history.

        Args:
            auth_header: Authorization header value to forward

        Returns:
            WorkoutContext with current workout data and recent sessions
        """
        exercises, recent_sessions, profile = await asyncio.gather(
            self.get_exercises(auth_header=auth_header),
            self.get_recent_sessions(auth_header=auth_header),
            self.get_user_profile(auth_header=auth_header),
        )

        cycle_length = (profile or {}).get("cycle_length", 7)
        total_volume = sum(ex.sets * ex.reps * (ex.weight or 0) * (2 if ex.per_side else 1) for ex in exercises)
        muscle_groups = self._identify_muscle_groups(exercises)

        return WorkoutContext(
            exercises=exercises,
            total_volume=total_volume,
            exercise_count=len(exercises),
            muscle_groups_worked=muscle_groups,
            recent_sessions=recent_sessions,
            cycle_length=cycle_length,
        )

    async def create_exercise(self, data: dict[str, Any], auth_header: str | None = None) -> dict[str, Any]:
        """Create a new exercise via the Workout API."""
        client = await self._get_client()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await client.post("/exercises", json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    async def edit_exercise(
        self, exercise_id: int, data: dict[str, Any], auth_header: str | None = None
    ) -> dict[str, Any]:
        """Edit an existing exercise via the Workout API."""
        client = await self._get_client()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await client.patch(f"/exercises/{exercise_id}", json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    async def create_session(self, data: dict[str, Any], auth_header: str | None = None) -> dict[str, Any]:
        """Log a workout session via the Workout API."""
        client = await self._get_client()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await client.post("/sessions", json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    async def create_measurement(self, data: dict[str, Any], auth_header: str | None = None) -> dict[str, Any]:
        """Add a body measurement via the Workout API."""
        client = await self._get_client()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await client.post("/measurements", json=data, headers=headers)
        response.raise_for_status()
        return response.json()

    async def get_batch_progress(
        self,
        exercise_names: list[str],
        metric: str = "weight",
        auth_header: str | None = None,
    ) -> dict[str, Any]:
        """Fetch batch progress time series for multiple exercises."""
        client = await self._get_client()
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await client.post(
            "/sessions/progress/batch",
            json={"exercise_names": exercise_names, "metric": metric},
            headers=headers,
        )
        response.raise_for_status()
        return response.json()

    async def get_overload_data(
        self,
        auth_header: str | None = None,
        exercise_names: list[str] | None = None,
    ) -> tuple[WorkoutContext, dict[str, Any], dict[str, Any]]:
        """Fetch workout context + weight and volume progress for exercises.

        Args:
            auth_header: Authorization header to forward.
            exercise_names: If provided, only analyze these exercises.
        """
        exercises = await self.get_exercises(auth_header=auth_header)
        if exercise_names:
            filter_set = {n.lower() for n in exercise_names}
            exercises = [ex for ex in exercises if ex.name.lower() in filter_set]
        if not exercises:
            ctx = WorkoutContext(exercises=[], total_volume=0, exercise_count=0, muscle_groups_worked=[])
            return ctx, {}, {}

        names = [ex.name for ex in exercises]
        total_volume = sum(ex.sets * ex.reps * (ex.weight or 0) * (2 if ex.per_side else 1) for ex in exercises)
        muscle_groups = self._identify_muscle_groups(exercises)
        ctx = WorkoutContext(
            exercises=exercises,
            total_volume=total_volume,
            exercise_count=len(exercises),
            muscle_groups_worked=muscle_groups,
        )

        weight_progress, volume_progress = await asyncio.gather(
            self.get_batch_progress(names, "weight", auth_header),
            self.get_batch_progress(names, "volume", auth_header),
        )
        return ctx, weight_progress, volume_progress

    async def get_ai_credentials(self, auth_header: str | None = None) -> dict[str, Any] | None:
        """Fetch decrypted AI provider credentials from the main API.

        Returns:
            Dict with api_key, base_url, model or None if not configured.
        """
        try:
            client = await self._get_client()
            headers = {}
            if auth_header:
                headers["Authorization"] = auth_header
            response = await client.get("/auth/ai-provider/credentials", headers=headers)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Failed to fetch AI credentials: {e}")
            return None

    def _identify_muscle_groups(self, exercises: list[ExerciseFromAPI]) -> list[str]:
        """Identify muscle groups from exercise names.

        Args:
            exercises: List of exercises

        Returns:
            List of identified muscle groups
        """
        muscle_keywords = {
            "chest": ["bench", "chest", "fly", "push-up", "pushup", "pec"],
            "back": ["row", "pull", "lat", "deadlift", "back"],
            "shoulders": ["shoulder", "press", "lateral", "delt", "overhead"],
            "biceps": ["curl", "bicep"],
            "triceps": ["tricep", "extension", "dip", "pushdown"],
            "legs": ["squat", "leg", "lunge", "calf", "hamstring", "quad"],
            "core": ["ab", "plank", "crunch", "core", "sit-up"],
        }

        found_groups = set()
        for exercise in exercises:
            name_lower = exercise.name.lower()
            for group, keywords in muscle_keywords.items():
                if any(kw in name_lower for kw in keywords):
                    found_groups.add(group)

        return list(found_groups)


# Global client instance
_workout_client: WorkoutAPIClient | None = None


def get_workout_client() -> WorkoutAPIClient:
    """Get the global workout API client."""
    global _workout_client
    if _workout_client is None:
        _workout_client = WorkoutAPIClient()
    return _workout_client


async def close_workout_client() -> None:
    """Close the global workout API client."""
    global _workout_client
    if _workout_client:
        await _workout_client.close()
        _workout_client = None
