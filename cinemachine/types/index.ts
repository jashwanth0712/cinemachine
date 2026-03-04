// Parent (from Google OAuth)
export interface Parent {
  id: string;
  google_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Kid profile under a parent
export interface KidProfile {
  id: string;
  parent_id: string;
  name: string;
  avatar_emoji: string;
  title: string;
  created_at: string;
}

// Story (movie project)
export interface Story {
  id: string;
  kid_profile_id: string;
  title: string;
  emoji: string;
  gradient_index: number;
  description: string | null;
  character_name: string | null;
  setting: string | null;
  plot: string | null;
  status: 'recording' | 'complete' | 'exported';
  export_url: string | null;
  created_at: string;
  updated_at: string;
  shot_count?: number;
  total_duration?: number;
  shots?: Shot[];
}

// Shot (video clip within a story)
export interface Shot {
  id: string;
  story_id: string;
  shot_order: number;
  emoji: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  video_gcs_uri: string | null;
  thumbnail_gcs_uri: string | null;
  created_at: string;
}

// Badge
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string | null;
  earned: boolean;
  earned_at?: string;
}

// Kid profile with stats
export interface KidProfileStats extends KidProfile {
  stories_count: number;
  total_shots: number;
  total_duration: number;
  badges: Badge[];
}

// Auth
export interface AuthResponse {
  parent: Parent;
  kid_profiles: KidProfile[];
  token: string;
}

// Upload
export interface UploadUrlResponse {
  signed_url: string;
  gcs_uri: string;
}

// Voice socket messages
export interface VoiceCommand {
  type: 'command';
  action: 'START_RECORDING' | 'STOP_RECORDING';
}

export interface VoiceStoryContext {
  type: 'story_context';
  character: string;
  setting: string;
  plot: string;
}

export interface VoiceTranscript {
  type: 'transcript';
  text: string;
}

export type VoiceMessage = VoiceCommand | VoiceStoryContext | VoiceTranscript;
