"""Authentication router: Google OAuth sign-in."""

import logging

from fastapi import APIRouter, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings
from app.database import get_pool
from app.jwt_utils import create_access_token
from app.models import AuthRequest, AuthResponse, KidProfile, Parent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=AuthResponse)
async def google_sign_in(body: AuthRequest) -> AuthResponse:
    """Authenticate a parent using a Google ID token.

    Verifies the token with Google, upserts the parent record, fetches
    any existing kid profiles, and returns the auth response.
    """
    # Verify the Google ID token (accept both Web and iOS client IDs)
    allowed_audiences = [
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_IOS_CLIENT_ID,
    ]
    payload = None
    for aud in allowed_audiences:
        if not aud:
            continue
        try:
            payload = google_id_token.verify_oauth2_token(
                body.google_token,
                google_requests.Request(),
                audience=aud,
            )
            break
        except ValueError:
            continue

    if payload is None:
        logger.warning("Google token verification failed for all audiences")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    google_id: str = payload["sub"]
    email: str = payload.get("email", "")
    display_name: str = payload.get("name", email)
    avatar_url: str | None = payload.get("picture")

    pool = get_pool()

    # Upsert parent
    row = await pool.fetchrow(
        """
        INSERT INTO parents (google_id, email, display_name, avatar_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (google_id) DO UPDATE
            SET email        = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                avatar_url   = EXCLUDED.avatar_url
        RETURNING *
        """,
        google_id,
        email,
        display_name,
        avatar_url,
    )

    parent = Parent(**dict(row))

    # Fetch kid profiles
    kid_rows = await pool.fetch(
        "SELECT * FROM kid_profiles WHERE parent_id = $1 ORDER BY created_at",
        parent.id,
    )
    kid_profiles = [KidProfile(**dict(r)) for r in kid_rows]

    jwt_token = create_access_token(
        parent_id=str(parent.id),
        google_id=google_id,
    )

    return AuthResponse(
        parent=parent,
        kid_profiles=kid_profiles,
        token=jwt_token,
    )
