"""Stories router: CRUD operations for movie stories."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_pool
from app.dependencies import get_current_parent_id
from app.models import Shot, Story, StoryCreate, StoryUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["stories"])


async def _verify_kid_belongs_to_parent(kid_profile_id: UUID, parent_id: UUID) -> None:
    """Raise 403 if the kid profile does not belong to the parent."""
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT id FROM kid_profiles WHERE id = $1 AND parent_id = $2",
        kid_profile_id,
        parent_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kid profile does not belong to the authenticated parent",
        )


@router.get("", response_model=list[Story])
async def list_stories(
    kid_profile_id: UUID = Query(..., description="Filter stories by kid profile"),
    parent_id: UUID = Depends(get_current_parent_id),
) -> list[Story]:
    """List stories for a given kid profile with shot count and total duration."""
    await _verify_kid_belongs_to_parent(kid_profile_id, parent_id)

    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT * FROM story_details
        WHERE kid_profile_id = $1
        ORDER BY created_at DESC
        """,
        kid_profile_id,
    )
    return [Story(**dict(r)) for r in rows]


@router.post("", response_model=Story, status_code=status.HTTP_201_CREATED)
async def create_story(
    body: StoryCreate,
    parent_id: UUID = Depends(get_current_parent_id),
) -> Story:
    """Create a new story for a kid profile."""
    await _verify_kid_belongs_to_parent(body.kid_profile_id, parent_id)

    pool = get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO stories (kid_profile_id, title, emoji, gradient_index)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        body.kid_profile_id,
        body.title,
        body.emoji,
        body.gradient_index,
    )
    story_data = dict(row)
    # New story has no shots yet
    story_data["shot_count"] = 0
    story_data["total_duration"] = 0.0
    return Story(**story_data)


@router.get("/{story_id}", response_model=dict)
async def get_story(
    story_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> dict:
    """Get a story with all its shots."""
    pool = get_pool()

    # Fetch story from the details view
    story_row = await pool.fetchrow(
        "SELECT * FROM story_details WHERE id = $1",
        story_id,
    )
    if story_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found",
        )

    story = Story(**dict(story_row))

    # Verify ownership
    await _verify_kid_belongs_to_parent(story.kid_profile_id, parent_id)

    # Fetch shots
    shot_rows = await pool.fetch(
        "SELECT * FROM shots WHERE story_id = $1 ORDER BY shot_order",
        story_id,
    )
    shots = [Shot(**dict(r)) for r in shot_rows]

    return {
        "story": story,
        "shots": shots,
    }


@router.put("/{story_id}", response_model=Story)
async def update_story(
    story_id: UUID,
    body: StoryUpdate,
    parent_id: UUID = Depends(get_current_parent_id),
) -> Story:
    """Update a story's metadata (title, description, status, etc.)."""
    pool = get_pool()

    # Fetch existing story to verify ownership
    existing = await pool.fetchrow(
        "SELECT kid_profile_id FROM stories WHERE id = $1",
        story_id,
    )
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story not found",
        )
    await _verify_kid_belongs_to_parent(existing["kid_profile_id"], parent_id)

    # Build dynamic UPDATE query from provided fields
    updates: dict[str, object] = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.status is not None:
        updates["status"] = body.status
    if body.character_name is not None:
        updates["character_name"] = body.character_name
    if body.setting is not None:
        updates["setting"] = body.setting
    if body.plot is not None:
        updates["plot"] = body.plot

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Build SET clause
    set_parts: list[str] = []
    values: list[object] = []
    for i, (col, val) in enumerate(updates.items(), start=1):
        set_parts.append(f"{col} = ${i}")
        values.append(val)

    values.append(story_id)
    query = (
        f"UPDATE stories SET {', '.join(set_parts)} "
        f"WHERE id = ${len(values)} "
        f"RETURNING *"
    )

    row = await pool.fetchrow(query, *values)

    story_data = dict(row)
    # Fetch aggregate data
    agg = await pool.fetchrow(
        """
        SELECT COALESCE(COUNT(*), 0) AS shot_count,
               COALESCE(SUM(duration_seconds), 0) AS total_duration
        FROM shots WHERE story_id = $1
        """,
        story_id,
    )
    story_data["shot_count"] = agg["shot_count"]
    story_data["total_duration"] = agg["total_duration"]

    return Story(**story_data)
