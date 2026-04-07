"""Google Calendar sync service for workout sessions.

Creates, updates, and deletes Google Calendar events when workout sessions
are logged, modified, or removed.
"""

import logging

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlmodel import Session

from services.api.src.crypto import decrypt_token
from services.api.src.database.config import get_settings
from services.api.src.database.db_models import UserTable, WorkoutSessionTable

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange an authorization code for access and refresh tokens.

    Returns:
        Dict with 'access_token', 'refresh_token', and other token fields.
    """
    settings = get_settings()
    response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if response.status_code != 200:
        logger.error("Google token exchange failed: %s", response.text)
        raise ValueError(f"Token exchange failed: {response.json().get('error_description', 'unknown error')}")
    return response.json()


def _get_credentials(user: UserTable) -> Credentials | None:
    """Build Google API credentials from a user's stored encrypted refresh token."""
    if not user.google_calendar_refresh_token:
        return None

    settings = get_settings()
    refresh_token = decrypt_token(user.google_calendar_refresh_token)

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )
    # Force a token refresh to get a valid access token
    creds.refresh(GoogleAuthRequest())
    return creds


def _get_calendar_service(user: UserTable):
    """Build an authorized Google Calendar API service for a user."""
    creds = _get_credentials(user)
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def list_calendars(user: UserTable) -> list[dict]:
    """List the user's Google Calendars."""
    service = _get_calendar_service(user)
    if not service:
        return []
    result = service.calendarList().list().execute()
    return [
        {"id": cal["id"], "summary": cal.get("summary", ""), "primary": cal.get("primary", False)}
        for cal in result.get("items", [])
    ]


def _build_event_body(session_row: WorkoutSessionTable, exercises: list | None = None) -> dict:
    """Build a Google Calendar event body from a workout session."""
    title = f"Workout {session_row.workout_day}"
    date_str = session_row.workout_date.isoformat()

    description_parts = []
    if session_row.notes:
        description_parts.append(session_row.notes)
    if session_row.duration_minutes:
        description_parts.append(f"Duration: {session_row.duration_minutes} min")
    if exercises:
        description_parts.append("\nExercises:")
        for ex in exercises:
            line = f"- {ex.exercise_name}: {ex.sets_completed}x{ex.reps_completed}"
            if ex.weight_used:
                line += f" @ {ex.weight_used}"
            description_parts.append(line)

    return {
        "summary": title,
        "description": "\n".join(description_parts) if description_parts else "",
        "start": {"date": date_str},
        "end": {"date": date_str},
        "transparency": "transparent",
    }


def sync_session_to_calendar(
    user: UserTable,
    session_row: WorkoutSessionTable,
    exercises: list | None,
    db_session: Session,
) -> None:
    """Create or update a Google Calendar event for a workout session.

    This is a fire-and-forget operation — failures are logged but do not
    propagate to the caller.
    """
    if not user.google_calendar_enabled or not user.google_calendar_refresh_token:
        return

    try:
        service = _get_calendar_service(user)
        if not service:
            return

        calendar_id = user.google_calendar_id or "primary"
        event_body = _build_event_body(session_row, exercises)

        if session_row.google_calendar_event_id:
            # Update existing event
            service.events().update(
                calendarId=calendar_id,
                eventId=session_row.google_calendar_event_id,
                body=event_body,
            ).execute()
            logger.info(
                "Updated calendar event %s for session %s", session_row.google_calendar_event_id, session_row.id
            )
        else:
            # Create new event
            created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
            session_row.google_calendar_event_id = created["id"]
            db_session.add(session_row)
            db_session.commit()
            logger.info("Created calendar event %s for session %s", created["id"], session_row.id)

    except HttpError as e:
        logger.warning("Google Calendar API error for session %s: %s", session_row.id, e)
    except Exception as e:
        logger.warning("Calendar sync failed for session %s: %s", session_row.id, e)


def delete_calendar_event(
    user: UserTable,
    session_row: WorkoutSessionTable,
) -> None:
    """Delete a Google Calendar event for a workout session.

    This is a fire-and-forget operation — failures are logged but do not
    propagate to the caller.
    """
    if not user.google_calendar_enabled or not user.google_calendar_refresh_token:
        return
    if not session_row.google_calendar_event_id:
        return

    try:
        service = _get_calendar_service(user)
        if not service:
            return

        calendar_id = user.google_calendar_id or "primary"
        service.events().delete(
            calendarId=calendar_id,
            eventId=session_row.google_calendar_event_id,
        ).execute()
        logger.info("Deleted calendar event %s for session %s", session_row.google_calendar_event_id, session_row.id)

    except HttpError as e:
        if e.resp.status == 410:
            logger.info("Calendar event already deleted for session %s", session_row.id)
        else:
            logger.warning("Google Calendar API error deleting event for session %s: %s", session_row.id, e)
    except Exception as e:
        logger.warning("Calendar event delete failed for session %s: %s", session_row.id, e)


def revoke_token(user: UserTable) -> None:
    """Revoke the user's Google Calendar refresh token."""
    if not user.google_calendar_refresh_token:
        return
    try:
        refresh_token = decrypt_token(user.google_calendar_refresh_token)
        httpx.post(
            "https://oauth2.googleapis.com/revoke",
            params={"token": refresh_token},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
    except Exception as e:
        logger.warning("Token revocation failed: %s", e)
