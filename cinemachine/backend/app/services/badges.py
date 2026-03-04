"""Badge evaluation service.

Checks a kid profile's stats against badge criteria and awards
any newly earned badges.
"""

import logging
from uuid import UUID

import asyncpg

from app.models import KidBadge

logger = logging.getLogger(__name__)


async def evaluate_badges(
    pool: asyncpg.Pool,
    kid_profile_id: UUID,
) -> list[KidBadge]:
    """Evaluate and award badges for a kid profile.

    Queries the kid_profile_stats view for current totals, compares
    against all badge criteria, and inserts any newly earned badges
    into the kid_badges table.

    Args:
        pool: asyncpg connection pool.
        kid_profile_id: UUID of the kid profile to evaluate.

    Returns:
        List of newly awarded KidBadge records (empty if none earned).
    """
    # Fetch current stats
    stats_row = await pool.fetchrow(
        """
        SELECT stories_count, total_shots, total_duration
        FROM kid_profile_stats
        WHERE id = $1
        """,
        kid_profile_id,
    )
    if stats_row is None:
        return []

    stories_count: int = stats_row["stories_count"]
    total_shots: int = stats_row["total_shots"]
    total_duration: float = stats_row["total_duration"]

    # Fetch all badge definitions
    badge_rows = await pool.fetch("SELECT * FROM badges")

    # Fetch already-earned badge IDs
    earned_rows = await pool.fetch(
        "SELECT badge_id FROM kid_badges WHERE kid_profile_id = $1",
        kid_profile_id,
    )
    earned_ids = {r["badge_id"] for r in earned_rows}

    newly_earned: list[KidBadge] = []

    for badge in badge_rows:
        badge_id = badge["id"]

        # Skip already-earned badges
        if badge_id in earned_ids:
            continue

        criteria_type: str = badge["criteria_type"]
        criteria_value: int = badge["criteria_value"]

        # Check if the criteria is met
        earned = False
        if criteria_type == "story_count" and stories_count >= criteria_value:
            earned = True
        elif criteria_type == "shot_count" and total_shots >= criteria_value:
            earned = True
        elif criteria_type == "duration" and total_duration >= criteria_value:
            earned = True

        if earned:
            row = await pool.fetchrow(
                """
                INSERT INTO kid_badges (kid_profile_id, badge_id)
                VALUES ($1, $2)
                ON CONFLICT (kid_profile_id, badge_id) DO NOTHING
                RETURNING *
                """,
                kid_profile_id,
                badge_id,
            )
            if row is not None:
                kid_badge = KidBadge(
                    id=row["id"],
                    kid_profile_id=row["kid_profile_id"],
                    badge_id=row["badge_id"],
                    earned_at=row["earned_at"],
                    emoji=badge["emoji"],
                    title=badge["title"],
                    description=badge["description"],
                )
                newly_earned.append(kid_badge)
                logger.info(
                    "Kid %s earned badge '%s'",
                    kid_profile_id,
                    badge["title"],
                )

    return newly_earned
