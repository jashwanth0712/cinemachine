"""Export router: trigger story video export."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_pool
from app.dependencies import get_current_parent_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["export"])


@router.post("/{story_id}/export")
async def export_story(
    story_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> dict:
    """Mark a story for export and trigger the export pipeline.

    In production this would trigger a Cloud Run Job that concatenates
    all shot videos into a single movie file using ffmpeg.
    """
    pool = get_pool()

    # Verify the story exists and belongs to the parent
    row = await pool.fetchrow(
        """
        SELECT s.id, s.status
        FROM stories s
        JOIN kid_profiles kp ON kp.id = s.kid_profile_id
        WHERE s.id = $1 AND kp.parent_id = $2
        """,
        story_id,
        parent_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found",
        )

    # TODO: In a real deployment, trigger a Cloud Run Job here:
    #   1. Use google-cloud-run to create/execute a Job
    #   2. Pass STORY_ID and DATABASE_URL as env vars
    #   3. The job (backend/export-job/) will concatenate videos with ffmpeg
    #   4. For now, we just update the status directly.

    await pool.execute(
        "UPDATE stories SET status = 'exported' WHERE id = $1",
        story_id,
    )

    return {
        "status": "exported",
        "story_id": str(story_id),
        "message": "Story marked as exported. Video export job would be triggered in production.",
    }
