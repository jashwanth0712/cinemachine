"""Kid profiles router: CRUD operations for kid profiles."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_pool
from app.dependencies import get_current_parent_id
from app.models import KidProfile, KidProfileCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kids", tags=["kids"])


@router.get("", response_model=list[KidProfile])
async def list_kid_profiles(
    parent_id: UUID = Depends(get_current_parent_id),
) -> list[KidProfile]:
    """List all kid profiles belonging to the authenticated parent."""
    pool = get_pool()
    rows = await pool.fetch(
        "SELECT * FROM kid_profiles WHERE parent_id = $1 ORDER BY created_at",
        parent_id,
    )
    return [KidProfile(**dict(r)) for r in rows]


@router.post("", response_model=KidProfile, status_code=status.HTTP_201_CREATED)
async def create_kid_profile(
    body: KidProfileCreate,
    parent_id: UUID = Depends(get_current_parent_id),
) -> KidProfile:
    """Create a new kid profile under the authenticated parent."""
    pool = get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO kid_profiles (parent_id, name, avatar_emoji)
        VALUES ($1, $2, $3)
        RETURNING *
        """,
        parent_id,
        body.name,
        body.avatar_emoji,
    )
    return KidProfile(**dict(row))


@router.get("/{kid_id}", response_model=KidProfile)
async def get_kid_profile(
    kid_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> KidProfile:
    """Get a single kid profile. Must belong to the authenticated parent."""
    pool = get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM kid_profiles WHERE id = $1 AND parent_id = $2",
        kid_id,
        parent_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid profile not found",
        )
    return KidProfile(**dict(row))


@router.delete("/{kid_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kid_profile(
    kid_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> None:
    """Delete a kid profile. Must belong to the authenticated parent."""
    pool = get_pool()
    result = await pool.execute(
        "DELETE FROM kid_profiles WHERE id = $1 AND parent_id = $2",
        kid_id,
        parent_id,
    )
    # result is like "DELETE 1" or "DELETE 0"
    if result == "DELETE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid profile not found",
        )
