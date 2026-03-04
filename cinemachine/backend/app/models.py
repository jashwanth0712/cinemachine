"""Pydantic models for request/response schemas and DB row mapping."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Parent
# ---------------------------------------------------------------------------

class ParentCreate(BaseModel):
    """Fields required to create or upsert a parent (internal use)."""
    google_id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None


class Parent(BaseModel):
    """Parent account returned to the client."""
    id: UUID
    google_id: str
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Kid Profile
# ---------------------------------------------------------------------------

class KidProfileCreate(BaseModel):
    """Fields required to create a kid profile."""
    name: str
    avatar_emoji: str = Field(default="\U0001f3ac")  # default: movie clapper


class KidProfile(BaseModel):
    """Kid profile returned to the client."""
    id: UUID
    parent_id: UUID
    name: str
    avatar_emoji: str
    title: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Story
# ---------------------------------------------------------------------------

class StoryCreate(BaseModel):
    """Fields required to create a story."""
    kid_profile_id: UUID
    title: str
    emoji: str = Field(default="\U0001f3ac")
    gradient_index: int = 0


class StoryUpdate(BaseModel):
    """Optional fields for updating a story."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    character_name: Optional[str] = None
    setting: Optional[str] = None
    plot: Optional[str] = None


class Story(BaseModel):
    """Story returned to the client."""
    id: UUID
    kid_profile_id: UUID
    title: str
    emoji: str
    gradient_index: int
    description: Optional[str] = None
    character_name: Optional[str] = None
    setting: Optional[str] = None
    plot: Optional[str] = None
    status: str
    export_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Aggregated fields from the story_details view
    shot_count: int = 0
    total_duration: float = 0.0


# ---------------------------------------------------------------------------
# Shot
# ---------------------------------------------------------------------------

class ShotCreate(BaseModel):
    """Fields required to create a shot."""
    story_id: UUID
    shot_order: int
    emoji: str = Field(default="\U0001f3ac")
    title: str
    description: Optional[str] = None
    duration_seconds: float = 0.0
    video_gcs_uri: Optional[str] = None
    thumbnail_gcs_uri: Optional[str] = None


class Shot(BaseModel):
    """Shot returned to the client."""
    id: UUID
    story_id: UUID
    shot_order: int
    emoji: str
    title: str
    description: Optional[str] = None
    duration_seconds: float
    video_gcs_uri: Optional[str] = None
    thumbnail_gcs_uri: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Badge
# ---------------------------------------------------------------------------

class Badge(BaseModel):
    """Badge definition."""
    id: UUID
    emoji: str
    title: str
    description: Optional[str] = None
    criteria_type: str
    criteria_value: int


class KidBadge(BaseModel):
    """A badge earned by a kid profile."""
    id: UUID
    kid_profile_id: UUID
    badge_id: UUID
    earned_at: datetime
    # Joined badge info
    emoji: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# Kid Profile Stats
# ---------------------------------------------------------------------------

class KidProfileStats(KidProfile):
    """Extended kid profile with aggregate stats and earned badges."""
    stories_count: int = 0
    total_shots: int = 0
    total_duration: float = 0.0
    badges: list[KidBadge] = []


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class AuthRequest(BaseModel):
    """Request body for Google sign-in."""
    google_token: str


class AuthResponse(BaseModel):
    """Response after successful Google sign-in."""
    parent: Parent
    kid_profiles: list[KidProfile]
    token: str


# ---------------------------------------------------------------------------
# Upload URL
# ---------------------------------------------------------------------------

class UploadUrlRequest(BaseModel):
    """Request body for generating a signed upload URL."""
    filename: str
    content_type: str


class UploadUrlResponse(BaseModel):
    """Response with the signed upload URL and target GCS URI."""
    signed_url: str
    gcs_uri: str
