import type {
  AuthResponse,
  KidProfile,
  KidProfileStats,
  Story,
  Shot,
  UploadUrlResponse,
} from '../types';

const API_BASE_URL = 'https://cinemachine-api-684023745855.us-central1.run.app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        errorMessage = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      // body wasn't JSON — keep the generic message
    }
    const error = new Error(errorMessage) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function authWithGoogle(googleToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ google_token: googleToken }),
  });
  return handleResponse<AuthResponse>(res);
}

// ---------------------------------------------------------------------------
// Kids
// ---------------------------------------------------------------------------

export async function getKidProfiles(token: string): Promise<KidProfile[]> {
  const res = await fetch(`${API_BASE_URL}/kids`, {
    headers: authHeaders(token),
  });
  return handleResponse<KidProfile[]>(res);
}

export async function createKidProfile(
  token: string,
  name: string,
  avatarEmoji: string
): Promise<KidProfile> {
  const res = await fetch(`${API_BASE_URL}/kids`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name, avatar_emoji: avatarEmoji }),
  });
  return handleResponse<KidProfile>(res);
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export async function getStories(
  token: string,
  kidProfileId: string
): Promise<Story[]> {
  const res = await fetch(
    `${API_BASE_URL}/stories?kid_profile_id=${encodeURIComponent(kidProfileId)}`,
    { headers: authHeaders(token) }
  );
  return handleResponse<Story[]>(res);
}

export async function getStory(token: string, storyId: string): Promise<Story> {
  const res = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
    headers: authHeaders(token),
  });
  // Backend returns { story, shots } — merge shots into the story object
  const data = await handleResponse<{ story: Story; shots: Shot[] }>(res);
  return { ...data.story, shots: data.shots };
}

export async function createStory(
  token: string,
  data: {
    kid_profile_id: string;
    title: string;
    emoji: string;
    gradient_index: number;
  }
): Promise<Story> {
  const res = await fetch(`${API_BASE_URL}/stories`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Story>(res);
}

export async function updateStory(
  token: string,
  storyId: string,
  data: Partial<Story>
): Promise<Story> {
  const res = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Story>(res);
}

// ---------------------------------------------------------------------------
// Shots
// ---------------------------------------------------------------------------

export async function getUploadUrl(
  token: string,
  filename: string,
  contentType: string
): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_BASE_URL}/shots/upload-url`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ filename, content_type: contentType }),
  });
  return handleResponse<UploadUrlResponse>(res);
}

export async function createShot(
  token: string,
  data: {
    story_id: string;
    shot_order: number;
    emoji: string;
    title: string;
    description?: string;
    duration_seconds: number;
    video_gcs_uri?: string;
  }
): Promise<Shot> {
  const res = await fetch(`${API_BASE_URL}/shots`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<Shot>(res);
}

export async function deleteShot(token: string, shotId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/shots/${shotId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return handleResponse<void>(res);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getKidProfile(
  token: string,
  kidId: string
): Promise<KidProfileStats> {
  const res = await fetch(`${API_BASE_URL}/kids/${kidId}/profile`, {
    headers: authHeaders(token),
  });
  return handleResponse<KidProfileStats>(res);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportStory(
  token: string,
  storyId: string
): Promise<{ export_url: string }> {
  const res = await fetch(`${API_BASE_URL}/stories/${storyId}/export`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleResponse<{ export_url: string }>(res);
}
