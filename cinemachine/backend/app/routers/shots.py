"""Shots router: create/delete shots and generate signed upload URLs."""

import logging
import uuid as uuid_mod
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import get_pool
from app.dependencies import get_current_parent_id
from app.models import Shot, ShotCreate, UploadUrlRequest, UploadUrlResponse
from app.services.storage import delete_blob, generate_signed_upload_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shots", tags=["shots"])


@router.post("/upload-url", response_model=UploadUrlResponse)
async def create_upload_url(
    body: UploadUrlRequest,
    parent_id: UUID = Depends(get_current_parent_id),
) -> UploadUrlResponse:
    """Generate a signed GCS upload URL for a video or thumbnail.

    The client uses this URL to upload the file directly to GCS,
    bypassing the backend for large binary transfers.
    """
    # Build a unique blob path
    unique_id = uuid_mod.uuid4().hex
    blob_path = f"uploads/{parent_id}/{unique_id}/{body.filename}"

    signed_url = generate_signed_upload_url(
        bucket_name=settings.GCS_BUCKET,
        blob_path=blob_path,
        content_type=body.content_type,
    )

    gcs_uri = f"gs://{settings.GCS_BUCKET}/{blob_path}"

    return UploadUrlResponse(signed_url=signed_url, gcs_uri=gcs_uri)


@router.post("", response_model=Shot, status_code=status.HTTP_201_CREATED)
async def create_shot(
    body: ShotCreate,
    parent_id: UUID = Depends(get_current_parent_id),
) -> Shot:
    """Create a new shot record in the database.

    The story must belong to a kid profile owned by the authenticated parent.
    """
    pool = get_pool()

    # Verify ownership chain: story -> kid_profile -> parent
    ownership = await pool.fetchrow(
        """
        SELECT s.id
        FROM stories s
        JOIN kid_profiles kp ON kp.id = s.kid_profile_id
        WHERE s.id = $1 AND kp.parent_id = $2
        """,
        body.story_id,
        parent_id,
    )
    if ownership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Story does not belong to the authenticated parent",
        )

    row = await pool.fetchrow(
        """
        INSERT INTO shots (story_id, shot_order, emoji, title, description,
                           duration_seconds, video_gcs_uri, thumbnail_gcs_uri)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        """,
        body.story_id,
        body.shot_order,
        body.emoji,
        body.title,
        body.description,
        body.duration_seconds,
        body.video_gcs_uri,
        body.thumbnail_gcs_uri,
    )
    return Shot(**dict(row))


@router.delete("/{shot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shot(
    shot_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> None:
    """Delete a shot record and its associated GCS objects.

    The shot must belong to a story owned by the authenticated parent.
    """
    pool = get_pool()

    # Fetch shot and verify ownership
    row = await pool.fetchrow(
        """
        SELECT sh.*
        FROM shots sh
        JOIN stories s ON s.id = sh.story_id
        JOIN kid_profiles kp ON kp.id = s.kid_profile_id
        WHERE sh.id = $1 AND kp.parent_id = $2
        """,
        shot_id,
        parent_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shot not found",
        )

    shot = dict(row)

    # Delete GCS objects if present
    bucket = settings.GCS_BUCKET
    for uri_field in ("video_gcs_uri", "thumbnail_gcs_uri"):
        gcs_uri: str | None = shot.get(uri_field)
        if gcs_uri and gcs_uri.startswith(f"gs://{bucket}/"):
            blob_path = gcs_uri.replace(f"gs://{bucket}/", "", 1)
            try:
                delete_blob(bucket, blob_path)
            except Exception:
                logger.warning(
                    "Failed to delete GCS blob %s for shot %s",
                    blob_path,
                    shot_id,
                    exc_info=True,
                )

    # Delete from database
    await pool.execute("DELETE FROM shots WHERE id = $1", shot_id)
