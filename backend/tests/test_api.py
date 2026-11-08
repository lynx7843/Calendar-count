from fastapi.testclient import TestClient

from app.main import app

TASK = {"title": "Write thesis", "dueDate": "2026-12-01T00:00:00Z"}


def test_health():
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_requires_token():
    assert TestClient(app).get("/tasks").status_code == 401


def test_task_crud_flow(client):
    created = client.post("/tasks", json=TASK)
    assert created.status_code == 201
    task = created.json()
    assert task["createdBy"] == "u1" and task["status"] == "pending"

    assert [t["id"] for t in client.get("/tasks").json()] == [task["id"]]
    assert client.get(f"/tasks/{task['id']}").json()["title"] == "Write thesis"

    patched = client.patch(f"/tasks/{task['id']}", json={"status": "done"}).json()
    assert patched["status"] == "done" and patched["title"] == "Write thesis"
    assert patched["createdAt"] == task["createdAt"]

    assert client.delete(f"/tasks/{task['id']}").status_code == 204
    assert client.get(f"/tasks/{task['id']}").status_code == 404


def test_patch_validates_merged_doc(client):
    task_id = client.post("/tasks", json=TASK).json()["id"]
    assert client.patch(f"/tasks/{task_id}", json={"createdBy": "u2"}).status_code == 422
    assert client.patch(f"/tasks/{task_id}", json={"title": None}).status_code == 422


def test_other_user_cannot_access(client, user):
    task_id = client.post("/tasks", json=TASK).json()["id"]
    user["uid"] = "u2"
    assert client.get("/tasks").json() == []
    assert client.get(f"/tasks/{task_id}").status_code == 404
    assert client.patch(f"/tasks/{task_id}", json={"status": "done"}).status_code == 404
    assert client.delete(f"/tasks/{task_id}").status_code == 404


def test_event_time_validation(client):
    bad = {"title": "Run", "startTime": "2026-01-01T10:00:00Z", "endTime": "2026-01-01T09:00:00Z"}
    assert client.post("/events", json=bad).status_code == 422
    event_id = client.post("/events", json={**bad, "endTime": "2026-01-01T11:00:00Z"}).json()["id"]
    assert client.patch(f"/events/{event_id}", json={"endTime": "2026-01-01T08:00:00Z"}).status_code == 422


def test_progress_and_assignment_create(client):
    task_id = client.post("/tasks", json=TASK).json()["id"]
    p = client.post("/progress", json={"taskId": task_id, "date": "2026-01-01T00:00:00Z", "hoursWorked": 2})
    a = client.post("/assignments", json={"taskId": task_id, "eventDate": "2026-01-02T00:00:00Z", "assignedTo": "u1"})
    assert p.status_code == 201 and a.status_code == 201
    assert len(client.get("/progress").json()) == 1 and len(client.get("/assignments").json()) == 1


def test_user_profile(client):
    assert client.get("/users/me").status_code == 404
    first = client.put("/users/me", json={"name": "Alex"}).json()
    assert first["id"] == "a@example.com" and first["email"] == "a@example.com"
    second = client.put("/users/me", json={"name": "Alex B", "tags": ["work"]}).json()
    assert second["createdAt"] == first["createdAt"]
    assert client.get("/users/me").json()["name"] == "Alex B"
    assert client.delete("/users/me").status_code == 204
    assert client.get("/users/me").status_code == 404


def test_user_without_email(client, user):
    del user["email"]
    assert client.put("/users/me", json={"name": "Alex"}).status_code == 400
