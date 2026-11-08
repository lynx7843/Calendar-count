import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

from app import deps
from app.models import Event, Progress, Task

CREDS = HTTPAuthorizationCredentials(scheme="Bearer", credentials="tok")


def test_event_rejects_end_before_start():
    with pytest.raises(ValidationError):
        Event(title="x", startTime="2026-01-02T10:00:00Z", endTime="2026-01-02T09:00:00Z")


def test_models_forbid_server_fields():
    with pytest.raises(ValidationError):
        Task(title="x", createdBy="someone")


def test_progress_rejects_negative_hours():
    with pytest.raises(ValidationError):
        Progress(taskId="t", date="2026-01-01T00:00:00Z", hoursWorked=-1)


def test_task_defaults():
    assert Task(title="x").status == "pending"


def test_get_user_returns_decoded_token(monkeypatch):
    monkeypatch.setattr(deps, "firebase_app", lambda: None)
    monkeypatch.setattr(deps.auth, "verify_id_token", lambda tok, app: {"uid": tok})
    assert deps.get_user(CREDS) == {"uid": "tok"}


def test_get_user_rejects_invalid_token(monkeypatch):
    def bad(tok, app):
        raise deps.auth.InvalidIdTokenError("bad")

    monkeypatch.setattr(deps, "firebase_app", lambda: None)
    monkeypatch.setattr(deps.auth, "verify_id_token", bad)
    with pytest.raises(HTTPException) as e:
        deps.get_user(CREDS)
    assert e.value.status_code == 401
