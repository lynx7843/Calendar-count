import os
from datetime import UTC, datetime

from dotenv import load_dotenv
from fastapi import APIRouter, Body, Depends, FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.auth.exceptions import GoogleAuthError
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import ValidationError

from app.deps import get_db, get_user
from app.models import Assignment, Event, Progress, Task, User

load_dotenv()

SERVER_FIELDS = {"createdBy", "createdAt"}

app = FastAPI(title="Calendar-count API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Handled inside CORS, so the browser sees this instead of "Failed to fetch".
@app.exception_handler(GoogleAuthError)
def missing_credentials(request, exc):
    return JSONResponse({"detail": "Server can't reach the database: set GOOGLE_APPLICATION_CREDENTIALS"}, status_code=503)


def now():
    return datetime.now(UTC)


def crud_router(name: str, model: type) -> APIRouter:
    router = APIRouter(prefix=f"/{name}", tags=[name])

    # Docs owned by another user look missing, never forbidden.
    def owned(db, uid: str, doc_id: str):
        ref = db.collection(name).document(doc_id)
        snap = ref.get()
        if not snap.exists or snap.to_dict().get("createdBy") != uid:
            raise HTTPException(404, f"{name}/{doc_id} not found")
        return ref, snap.to_dict()

    @router.get("")
    def list_docs(user=Depends(get_user), db=Depends(get_db)):
        # shortcut: no pagination, add cursors when lists grow large
        query = db.collection(name).where(filter=FieldFilter("createdBy", "==", user["uid"]))
        return [{"id": s.id, **s.to_dict()} for s in query.stream()]

    @router.post("", status_code=201)
    def create_doc(body: model, user=Depends(get_user), db=Depends(get_db)):
        data = {**body.model_dump(), "createdBy": user["uid"], "createdAt": now()}
        ref = db.collection(name).document()
        ref.set(data)
        return {"id": ref.id, **data}

    @router.get("/{doc_id}")
    def get_doc(doc_id: str, user=Depends(get_user), db=Depends(get_db)):
        _, data = owned(db, user["uid"], doc_id)
        return {"id": doc_id, **data}

    @router.patch("/{doc_id}")
    def update_doc(doc_id: str, patch: dict = Body(...), user=Depends(get_user), db=Depends(get_db)):
        ref, data = owned(db, user["uid"], doc_id)
        current = {k: v for k, v in data.items() if k not in SERVER_FIELDS}
        try:
            merged = model(**{**current, **patch}).model_dump()
        except ValidationError as e:
            raise RequestValidationError(e.errors(include_url=False))
        ref.update(merged)
        return {"id": doc_id, **data, **merged}

    @router.delete("/{doc_id}", status_code=204)
    def delete_doc(doc_id: str, user=Depends(get_user), db=Depends(get_db)):
        ref, _ = owned(db, user["uid"], doc_id)
        ref.delete()

    return router


users = APIRouter(prefix="/users", tags=["users"])


def user_ref(user: dict, db):
    if not user.get("email"):
        raise HTTPException(400, "Account has no email")
    return db.collection("users").document(user["email"])


@users.get("/me")
def get_me(user=Depends(get_user), db=Depends(get_db)):
    snap = user_ref(user, db).get()
    if not snap.exists:
        raise HTTPException(404, "Profile not found")
    return {"id": snap.id, **snap.to_dict()}


@users.put("/me")
def put_me(body: User, user=Depends(get_user), db=Depends(get_db)):
    ref = user_ref(user, db)
    snap = ref.get()
    created = snap.to_dict()["createdAt"] if snap.exists else now()
    data = {**body.model_dump(), "email": user["email"], "createdAt": created}
    ref.set(data)
    return {"id": ref.id, **data}


@users.delete("/me", status_code=204)
def delete_me(user=Depends(get_user), db=Depends(get_db)):
    user_ref(user, db).delete()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(users)
for name, model in [("tasks", Task), ("events", Event), ("progress", Progress), ("assignments", Assignment)]:
    app.include_router(crud_router(name, model))
