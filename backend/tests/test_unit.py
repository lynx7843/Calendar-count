import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

from app import deps
from app.models import Event, Progress, Task, User

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
    monkeypatch.setattr(deps.auth, "verify_id_token", lambda tok, app, check_revoked: {"uid": tok, "revoked_checked": check_revoked})
    assert deps.get_user(CREDS) == {"uid": "tok", "revoked_checked": True}


def test_get_user_rejects_invalid_token(monkeypatch):
    def bad(tok, app, check_revoked):
        raise deps.auth.InvalidIdTokenError("bad")

    monkeypatch.setattr(deps, "firebase_app", lambda: None)
    monkeypatch.setattr(deps.auth, "verify_id_token", bad)
    with pytest.raises(HTTPException) as e:
        deps.get_user(CREDS)
    assert e.value.status_code == 401


def test_event_repeat_fields_validated():
    base = {"title": "x", "startTime": "2026-01-01T10:00:00Z", "endTime": "2026-01-01T11:00:00Z"}
    assert Event(**base, frequency="weekly", weekdays=[0, 6]).weekdays == [0, 6]
    for bad in [{"weekdays": [7]}, {"frequency": "hourly"}, {"completedDates": ["2026-1-1"]}]:
        with pytest.raises(ValidationError):
            Event(**base, **bad)


def test_subtasks_are_typed():
    assert Task(title="x", subTasks=[{"title": "a"}]).subTasks[0].done is False
    with pytest.raises(ValidationError):
        Task(title="x", subTasks=["a"])


def test_firebase_app_uses_project_id(monkeypatch):
    seen = {}
    monkeypatch.setenv("VITE_FIREBASE_PROJECT_ID", "proj")
    monkeypatch.setattr(deps.firebase_admin, "initialize_app", lambda options=None: seen.setdefault("o", options))
    deps.firebase_app.cache_clear()
    deps.firebase_app()
    deps.firebase_app.cache_clear()
    assert seen["o"] == {"projectId": "proj"}


@pytest.mark.parametrize("err", ["RevokedIdTokenError", "UserDisabledError", "UserNotFoundError"])
def test_get_user_rejects_revoked_disabled_or_deleted(monkeypatch, err):
    def bad(tok, app, check_revoked):
        raise getattr(deps.auth, err)("nope")

    monkeypatch.setattr(deps, "firebase_app", lambda: None)
    monkeypatch.setattr(deps.auth, "verify_id_token", bad)
    with pytest.raises(HTTPException) as e:
        deps.get_user(CREDS)
    assert e.value.status_code == 401


def test_size_caps():
    base = {"title": "x", "startTime": "2026-01-01T10:00:00Z", "endTime": "2026-01-01T11:00:00Z"}
    assert Event(**{**base, "title": "a" * 200, "tags": ["t" * 50] * 20})
    for bad in [{"title": "a" * 201}, {"description": "a" * 5001}, {"tags": ["t"] * 21}, {"tags": ["t" * 51]},
                {"weekdays": [0] * 8}, {"color": "c" * 21}]:
        with pytest.raises(ValidationError):
            Event(**{**base, **bad})
    with pytest.raises(ValidationError):
        Task(title="x", subTasks=[{"title": "a"}] * 101)
    with pytest.raises(ValidationError):
        Progress(taskId="t", date="2026-01-01T00:00:00Z", hoursWorked=25)
    with pytest.raises(ValidationError):
        User(name="x", preferences={f"k{i}": 1 for i in range(21)})
    with pytest.raises(ValidationError):
        User(name="x", preferences={"nested": {"a": 1}})
