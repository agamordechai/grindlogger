"""Tests for sync-oriented API additions and the email verification / password reset flows."""

import time
import uuid
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from services.api.src import api as api_module
from services.api.src.api import app, limiter
from services.api.src.auth import create_access_token
from services.api.src.database.database import get_session, init_db
from services.api.src.database.db_models import (
    BodyMeasurementTable,
    EmailTokenTable,
    ExerciseTable,
    UserTable,
    WorkoutSessionTable,
)

limiter.enabled = False


@pytest.fixture(scope="module", autouse=True)
def _tables() -> None:
    """Make sure the schema exists (idempotent; CI and local databases may start empty)."""
    init_db()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> dict[str, list[tuple[str, str]]]:
    """Capture outgoing verification / reset emails as (address, raw token)."""
    box: dict[str, list[tuple[str, str]]] = {"verify": [], "reset": []}
    monkeypatch.setattr(
        api_module, "send_verification_email", lambda to, name, token: box["verify"].append((to, token))
    )
    monkeypatch.setattr(
        api_module, "send_password_reset_email", lambda to, name, token: box["reset"].append((to, token))
    )
    return box


def _register(
    client: TestClient,
    email: str | None = None,
    password: str = "correct-horse",  # noqa: S107
) -> tuple[str, dict]:
    email = email or f"user-{uuid.uuid4().hex[:10]}@example.com"
    response = client.post("/auth/register", json={"email": email, "name": "Tester", "password": password})
    assert response.status_code == 201, response.text
    return email, response.json()


def _headers(tokens: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ---------- exercise sync fields ----------


def test_exercise_create_and_patch_accept_state_fields(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)

    created = client.post(
        "/exercises",
        headers=headers,
        json={"name": "Row", "sets": 3, "reps": 10, "sort_order": 4, "superset_group": 2, "notes": "slow"},
    )
    assert created.status_code == 201
    body = created.json()
    assert (body["sort_order"], body["superset_group"], body["archived"]) == (4, 2, False)

    patched = client.patch(
        f"/exercises/{body['id']}?auto_log=false",
        headers=headers,
        json={"archived": True, "sort_order": 9, "superset_group": None},
    )
    assert patched.status_code == 200
    out = patched.json()
    assert (out["archived"], out["sort_order"], out["superset_group"]) == (True, 9, None)


def test_list_exercises_include_archived(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    active = client.post("/exercises", headers=headers, json={"name": "A", "sets": 1, "reps": 1}).json()
    archived = client.post(
        "/exercises", headers=headers, json={"name": "B", "sets": 1, "reps": 1, "archived": True}
    ).json()

    default = client.get("/exercises?page_size=200", headers=headers).json()
    assert [e["id"] for e in default["items"]] == [active["id"]]

    everything = client.get("/exercises?page_size=200&include_archived=true", headers=headers).json()
    assert {e["id"] for e in everything["items"]} == {active["id"], archived["id"]}
    assert everything["total"] == 2


def test_patch_auto_log_can_be_disabled(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    ex = client.post("/exercises", headers=headers, json={"name": "Squat", "sets": 3, "reps": 5}).json()

    client.patch(f"/exercises/{ex['id']}?auto_log=false", headers=headers, json={"weight": 100})
    assert client.get("/sessions/index", headers=headers).json() == []

    client.patch(f"/exercises/{ex['id']}", headers=headers, json={"weight": 105})
    assert len(client.get("/sessions/index", headers=headers).json()) == 1


def test_archive_reorder_and_superset_bump_updated_at(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    a = client.post("/exercises", headers=headers, json={"name": "A", "sets": 1, "reps": 1}).json()
    b = client.post("/exercises", headers=headers, json={"name": "B", "sets": 1, "reps": 1}).json()
    time.sleep(0.01)

    client.post("/exercises/superset", headers=headers, json={"exercise_ids": [a["id"], b["id"]]})
    client.post("/exercises/reorder", headers=headers, json={"items": [{"id": a["id"], "sort_order": 3}]})
    items = {e["id"]: e for e in client.get("/exercises?page_size=200", headers=headers).json()["items"]}
    assert items[a["id"]]["updated_at"] > a["updated_at"]
    assert items[b["id"]]["updated_at"] > b["updated_at"]


def test_patch_leaving_superset_unlinks_last_member(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    a = client.post("/exercises", headers=headers, json={"name": "A", "sets": 1, "reps": 1}).json()
    b = client.post("/exercises", headers=headers, json={"name": "B", "sets": 1, "reps": 1}).json()
    group = client.post("/exercises/superset", headers=headers, json={"exercise_ids": [a["id"], b["id"]]}).json()
    assert group["superset_group"] >= 1

    client.patch(f"/exercises/{a['id']}?auto_log=false", headers=headers, json={"superset_group": None})
    items = {e["id"]: e for e in client.get("/exercises?page_size=200", headers=headers).json()["items"]}
    assert items[a["id"]]["superset_group"] is None
    assert items[b["id"]]["superset_group"] is None  # a one-member group is not a superset


# ---------- sessions index ----------


def test_sessions_index_lists_all_sessions(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    for day in ("2024-01-05", "2026-03-01"):
        r = client.post(
            "/sessions",
            headers=headers,
            json={"date": day, "workout_day": "A", "exercises": []},
        )
        assert r.status_code == 201, r.text

    index = client.get("/sessions/index", headers=headers).json()
    assert [row["date"] for row in index] == ["2026-03-01", "2024-01-05"]
    assert {"id", "date", "workout_day", "updated_at"} <= set(index[0])


# ---------- profile ----------


def test_profile_units_round_trip(client: TestClient) -> None:
    _, tokens = _register(client)
    headers = _headers(tokens)
    me = client.get("/auth/me", headers=headers).json()
    assert me["units"] is None  # not chosen yet

    updated = client.patch("/auth/me", headers=headers, json={"units": "imperial", "cycle_length": 5})
    assert updated.status_code == 200
    body = updated.json()
    assert (body["units"], body["cycle_length"]) == ("imperial", 5)
    assert body["profile_updated_at"] >= me["profile_updated_at"]

    assert client.patch("/auth/me", headers=headers, json={"units": "furlongs"}).status_code == 422


# ---------- email verification ----------


def test_register_sends_verification_and_verify_marks_user(client: TestClient, sent: dict) -> None:
    email, tokens = _register(client)
    assert client.get("/auth/me", headers=_headers(tokens)).json()["email_verified"] is False
    assert [to for to, _ in sent["verify"]] == [email]

    token = sent["verify"][0][1]
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 204
    assert client.get("/auth/me", headers=_headers(tokens)).json()["email_verified"] is True

    # single use
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 400
    assert client.post("/auth/verify-email", json={"token": "x" * 40}).status_code == 400


def test_verify_token_expires(client: TestClient, sent: dict) -> None:
    _register(client)
    token = sent["verify"][0][1]
    with next(get_session()) as session:
        row = session.exec(select(EmailTokenTable).order_by(EmailTokenTable.id.desc())).first()
        row.expires_at = row.expires_at - timedelta(days=2)
        session.add(row)
        session.commit()
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 400


def test_resend_verification_replaces_old_token(client: TestClient, sent: dict) -> None:
    _, tokens = _register(client)
    first = sent["verify"][0][1]
    assert client.post("/auth/resend-verification", headers=_headers(tokens)).status_code == 202
    second = sent["verify"][1][1]
    assert client.post("/auth/verify-email", json={"token": first}).status_code == 400
    assert client.post("/auth/verify-email", json={"token": second}).status_code == 204


# ---------- password reset ----------


def test_forgot_password_does_not_reveal_accounts(client: TestClient, sent: dict) -> None:
    email, _ = _register(client)
    known = client.post("/auth/forgot-password", json={"email": email})
    unknown = client.post("/auth/forgot-password", json={"email": f"nobody-{uuid.uuid4().hex[:8]}@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [to for to, _ in sent["reset"]] == [email]


def test_reset_password_flow_revokes_old_refresh_tokens(client: TestClient, sent: dict) -> None:
    email, tokens = _register(client)
    old_refresh = tokens["refresh_token"]
    time.sleep(1.1)  # token `iat` has whole-second resolution; the reset must land in a later second
    client.post("/auth/forgot-password", json={"email": email})
    reset_token = sent["reset"][0][1]

    assert client.post("/auth/reset-password", json={"token": reset_token, "password": "short"}).status_code == 422
    done = client.post("/auth/reset-password", json={"token": reset_token, "password": "a-brand-new-pass"})
    assert done.status_code == 204
    assert (
        client.post("/auth/reset-password", json={"token": reset_token, "password": "another-pass-1"}).status_code
        == 400
    )

    assert client.post("/auth/login", json={"email": email, "password": "correct-horse"}).status_code == 401
    login = client.post("/auth/login", json={"email": email, "password": "a-brand-new-pass"})
    assert login.status_code == 200

    # tokens minted before the reset can no longer refresh; the one from the new login still can
    assert client.post("/auth/refresh", json={"refresh_token": old_refresh}).status_code == 401
    time.sleep(1.1)
    new_login = client.post("/auth/login", json={"email": email, "password": "a-brand-new-pass"}).json()
    assert client.post("/auth/refresh", json={"refresh_token": new_login["refresh_token"]}).status_code == 200


# ---------- account safety ----------


def test_register_cannot_hijack_social_account(client: TestClient) -> None:
    email = f"social-{uuid.uuid4().hex[:8]}@example.com"
    with next(get_session()) as session:
        session.add(UserTable(google_id=f"g-{uuid.uuid4().hex}", email=email, name="Social", email_verified=True))
        session.commit()

    response = client.post("/auth/register", json={"email": email, "name": "Attacker", "password": "hunter2hunter2"})
    assert response.status_code == 409
    assert "social login" in response.json()["detail"]


def test_oauth_link_clears_unverified_password(client: TestClient) -> None:
    from services.api.src.database.user_repository import UserRepository

    email, _ = _register(client)  # unverified email/password account
    with next(get_session()) as session:
        repo = UserRepository(session)
        user, is_new = repo.find_or_create(google_id=f"g-{uuid.uuid4().hex}", email=email, name="Real Owner")
        assert not is_new
        assert user.email_verified is True
        assert user.password_hash is None
    assert client.post("/auth/login", json={"email": email, "password": "correct-horse"}).status_code == 401


def test_disabled_user_cannot_login_or_refresh(client: TestClient) -> None:
    email, tokens = _register(client)
    with next(get_session()) as session:
        user = session.exec(select(UserTable).where(UserTable.email == email)).one()
        user.disabled = True
        session.add(user)
        session.commit()
    assert client.post("/auth/login", json={"email": email, "password": "correct-horse"}).status_code == 403
    assert client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 403


def test_delete_account_removes_all_user_data(client: TestClient, sent: dict) -> None:
    email, tokens = _register(client)
    headers = _headers(tokens)
    client.post("/exercises", headers=headers, json={"name": "A", "sets": 1, "reps": 1})
    client.post(
        "/sessions",
        headers=headers,
        json={
            "date": "2026-01-02",
            "workout_day": "A",
            "exercises": [
                {
                    "exercise_name": "A",
                    "sets_completed": 1,
                    "reps_completed": 5,
                    "weight_used": 50,
                    "order": 0,
                    "sets": [{"set_number": 1, "reps": 5, "weight": 50, "set_type": "normal"}],
                }
            ],
        },
    )
    client.post("/measurements", headers=headers, json={"date": "2026-01-02", "weight_kg": 80})

    assert client.delete("/auth/me", headers=headers).status_code == 204

    with next(get_session()) as session:
        assert session.exec(select(UserTable).where(UserTable.email == email)).first() is None
        for model in (ExerciseTable, WorkoutSessionTable, BodyMeasurementTable, EmailTokenTable):
            leftovers = session.exec(select(model)).all()
            assert all(getattr(row, "user_id", None) != tokens.get("user_id") for row in leftovers)
        # no orphaned rows referencing the deleted user at all
        assert not _orphans(session)


def _orphans(session: Session) -> list:
    user_ids = {u.id for u in session.exec(select(UserTable)).all()}
    rows: list = []
    for model in (ExerciseTable, WorkoutSessionTable, BodyMeasurementTable, EmailTokenTable):
        rows += [r for r in session.exec(select(model)).all() if r.user_id not in user_ids]
    return rows


def test_access_token_helper_still_works() -> None:
    assert create_access_token(data={"sub": "1"})
