"""Create and consume single-use email tokens (verification and password reset)."""

import datetime as dt
import hashlib
import secrets

from sqlmodel import Session, select

from services.api.src.database.db_models import EmailTokenTable

VERIFY_TTL = dt.timedelta(hours=24)
RESET_TTL = dt.timedelta(hours=1)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _utcnow() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


def create_token(session: Session, user_id: int, purpose: str, ttl: dt.timedelta) -> str:
    """Create a token, invalidating the user's older unused tokens of the same purpose. Returns the raw token."""
    now = _utcnow()
    for old in session.exec(
        select(EmailTokenTable).where(
            EmailTokenTable.user_id == user_id,
            EmailTokenTable.purpose == purpose,
            EmailTokenTable.used_at.is_(None),  # type: ignore[union-attr]
        )
    ).all():
        old.used_at = now
        session.add(old)

    raw = secrets.token_urlsafe(32)
    session.add(EmailTokenTable(user_id=user_id, purpose=purpose, token_hash=_hash(raw), expires_at=now + ttl))
    session.commit()
    return raw


def consume_token(session: Session, raw: str, purpose: str) -> int | None:
    """Mark a token used and return its user id, or None if it is unknown, expired, used or the wrong purpose."""
    row = session.exec(
        select(EmailTokenTable).where(EmailTokenTable.token_hash == _hash(raw), EmailTokenTable.purpose == purpose)
    ).first()
    if row is None or row.used_at is not None:
        return None
    now = _utcnow()
    # SQLite hands datetimes back naive; they were stored as UTC.
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=dt.UTC)
    if expires < now:
        return None
    row.used_at = now
    session.add(row)
    session.commit()
    return row.user_id
