"""Profile router: kid profile stats and earned badges."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_pool
from app.dependencies import get_current_parent_id
from app.models import KidBadge, KidProfileStats
from app.services.badges import evaluate_badges

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kids", tags=["profile"])


@router.get("/{kid_id}/profile", response_model=KidProfileStats)
async def get_kid_profile_stats(
    kid_id: UUID,
    parent_id: UUID = Depends(get_current_parent_id),
) -> KidProfileStats:
    """Get full kid profile with aggregate stats and earned badges.

    Evaluates any newly earned badges before returning.
    """
    pool = get_pool()

    # Fetch from kid_profile_stats view
    row = await pool.fetchrow(
        """
        SELECT * FROM kid_profile_stats
        WHERE id = $1 AND parent_id = $2
        """,
        kid_id,
        parent_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kid profile not found",
        )

    # Evaluate and award any new badges
    await evaluate_badges(pool, kid_id)

    # Fetch earned badges with badge details
    badge_rows = await pool.fetch(
        """
        SELECT kb.id, kb.kid_profile_id, kb.badge_id, kb.earned_at,
               b.emoji, b.title, b.description
        FROM kid_badges kb
        JOIN badges b ON b.id = kb.badge_id
        WHERE kb.kid_profile_id = $1
        ORDER BY kb.earned_at
        """,
        kid_id,
    )
    badges = [KidBadge(**dict(r)) for r in badge_rows]

    stats_data = dict(row)
    stats_data["badges"] = badges

    return KidProfileStats(**stats_data)
