-- Cinemachine Database Schema
-- PostgreSQL 15, Cloud SQL

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

-- Parents: Google OAuth accounts (the signing-in adult)
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kid profiles under a parent account
CREATE TABLE kid_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_emoji TEXT NOT NULL DEFAULT '🎬',
    title TEXT NOT NULL DEFAULT 'New Director',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kid_profiles_parent_id ON kid_profiles(parent_id);

-- Stories: Movie projects
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_profile_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🎬',
    gradient_index INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    character_name TEXT,
    setting TEXT,
    plot TEXT,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'complete', 'exported')),
    export_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stories_kid_profile_id ON stories(kid_profile_id);

-- Shots: Individual video clips within a story
CREATE TABLE shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    shot_order INTEGER NOT NULL,
    emoji TEXT NOT NULL DEFAULT '🎬',
    title TEXT NOT NULL,
    description TEXT,
    duration_seconds REAL NOT NULL DEFAULT 0,
    video_gcs_uri TEXT,
    thumbnail_gcs_uri TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(story_id, shot_order)
);

CREATE INDEX idx_shots_story_id ON shots(story_id);

-- Badges: Gamification badges (seeded with defaults)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emoji TEXT NOT NULL,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    criteria_type TEXT NOT NULL,  -- 'story_count', 'shot_count', 'duration', 'special'
    criteria_value INTEGER NOT NULL DEFAULT 1
);

-- Kid badges: earned badges per kid profile
CREATE TABLE kid_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_profile_id UUID NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(kid_profile_id, badge_id)
);

CREATE INDEX idx_kid_badges_kid_profile_id ON kid_badges(kid_profile_id);

-- ============================================================
-- Views
-- ============================================================

-- Story details with shot count and total duration
CREATE VIEW story_details AS
SELECT
    s.*,
    COALESCE(agg.shot_count, 0) AS shot_count,
    COALESCE(agg.total_duration, 0) AS total_duration
FROM stories s
LEFT JOIN (
    SELECT
        story_id,
        COUNT(*) AS shot_count,
        SUM(duration_seconds) AS total_duration
    FROM shots
    GROUP BY story_id
) agg ON agg.story_id = s.id;

-- Kid profile stats
CREATE VIEW kid_profile_stats AS
SELECT
    kp.*,
    COALESCE(st.stories_count, 0) AS stories_count,
    COALESCE(st.total_shots, 0) AS total_shots,
    COALESCE(st.total_duration, 0) AS total_duration
FROM kid_profiles kp
LEFT JOIN (
    SELECT
        s.kid_profile_id,
        COUNT(DISTINCT s.id) AS stories_count,
        COUNT(sh.id) AS total_shots,
        COALESCE(SUM(sh.duration_seconds), 0) AS total_duration
    FROM stories s
    LEFT JOIN shots sh ON sh.story_id = s.id
    GROUP BY s.kid_profile_id
) st ON st.kid_profile_id = kp.id;

-- ============================================================
-- Seed Data: Default Badges
-- ============================================================

INSERT INTO badges (emoji, title, description, criteria_type, criteria_value) VALUES
    ('🌟', 'First Movie', 'Complete your first movie!', 'story_count', 1),
    ('🎬', 'Director', 'Complete 3 movies', 'story_count', 3),
    ('🏆', '5 Movies', 'Complete 5 movies', 'story_count', 5),
    ('⭐', 'Superstar', 'Complete 10 movies', 'story_count', 10),
    ('🎨', 'Creative', 'Record 10 shots total', 'shot_count', 10),
    ('🚀', 'Explorer', 'Record 30 shots total', 'shot_count', 30),
    ('⏱️', 'Marathon', 'Record 5 minutes of footage', 'duration', 300),
    ('🎥', 'Blockbuster', 'Record 15 minutes of footage', 'duration', 900);

-- ============================================================
-- Updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parents_updated_at
    BEFORE UPDATE ON parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
