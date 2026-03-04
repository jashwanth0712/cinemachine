"""Auth dependencies for FastAPI endpoints."""

import logging
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings
from app.database import get_pool

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer()


async def get_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Verify the Bearer token as a Google ID token and return its payload.

    Raises HTTPException 401 if the token is invalid or expired.
    """
    token = credentials.credentials

    allowed_audiences = [
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_IOS_CLIENT_ID,
    ]
    for aud in allowed_audiences:
        if not aud:
            continue
        try:
            return google_id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=aud,
            )
        except ValueError:
            continue

    logger.warning("Invalid Google ID token for all audiences")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired Google token",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_parent_id(
    payload: dict[str, Any] = Depends(get_token_payload),
) -> UUID:
    """Extract the parent_id (UUID) from the verified token.

    Looks up the parent record by google_id (the 'sub' claim) and returns
    the internal UUID primary key.

    Raises HTTPException 401 if no matching parent exists in the database.
    """
    google_id: str = payload.get("sub", "")

    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT id FROM parents WHERE google_id = $1",
        google_id,
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parent account not found. Please sign in first.",
        )

    return row["id"]
