import os
from functools import lru_cache

import firebase_admin
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, firestore

bearer = HTTPBearer()


@lru_cache
def firebase_app():
    # Service account from GOOGLE_APPLICATION_CREDENTIALS; project ID lets token checks work without it.
    project = os.getenv("VITE_FIREBASE_PROJECT_ID")
    return firebase_admin.initialize_app(options={"projectId": project} if project else None)


def get_db():
    return firestore.client(firebase_app())


def get_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        # check_revoked rejects signed-out-everywhere, disabled and deleted users (one extra lookup per request).
        return auth.verify_id_token(creds.credentials, app=firebase_app(), check_revoked=True)
    except (ValueError, auth.InvalidIdTokenError, auth.UserDisabledError, auth.UserNotFoundError):
        raise HTTPException(401, "Invalid or expired token")
