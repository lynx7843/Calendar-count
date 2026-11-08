import itertools
from collections import defaultdict

import pytest
from fastapi.testclient import TestClient

from app.deps import get_db, get_user
from app.main import app


class FakeSnap:
    def __init__(self, id, data):
        self.id, self._data = id, data
        self.exists = data is not None

    def to_dict(self):
        return dict(self._data) if self.exists else None


class FakeDoc:
    def __init__(self, store, id):
        self.store, self.id = store, id

    def get(self):
        return FakeSnap(self.id, self.store.get(self.id))

    def set(self, data):
        self.store[self.id] = dict(data)

    def update(self, data):
        self.store[self.id].update(data)

    def delete(self):
        self.store.pop(self.id, None)


class FakeCollection:
    ids = itertools.count()

    def __init__(self, store):
        self.store = store

    def document(self, id=None):
        return FakeDoc(self.store, id or f"doc{next(self.ids)}")

    # shortcut: supports only "==" filters, extend when queries grow
    def where(self, filter):
        self.filter = filter
        return self

    def stream(self):
        f = self.filter
        return [FakeSnap(i, d) for i, d in self.store.items() if d.get(f.field_path) == f.value]


class FakeDb:
    def __init__(self):
        self.data = defaultdict(dict)

    def collection(self, name):
        return FakeCollection(self.data[name])


@pytest.fixture
def user():
    return {"uid": "u1", "email": "a@example.com"}


@pytest.fixture
def client(user):
    db = FakeDb()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()
