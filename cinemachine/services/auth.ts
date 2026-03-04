import * as SecureStore from 'expo-secure-store';
import { authWithGoogle as apiAuthWithGoogle } from './api';
import type { AuthResponse, Parent } from '../types';

const TOKEN_KEY = 'cinemachine_auth_token';
const PARENT_KEY = 'cinemachine_parent';

// Google OAuth discovery endpoints
export const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const GOOGLE_CLIENT_ID =
  '684023745855-77m1d11vt9clk02568gnh8j1taiqu88o.apps.googleusercontent.com';

// ---------------------------------------------------------------------------
// Token & parent persistence
// ---------------------------------------------------------------------------

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getStoredParent(): Promise<Parent | null> {
  try {
    const raw = await SecureStore.getItemAsync(PARENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Parent;
  } catch {
    return null;
  }
}

export async function storeAuthData(
  token: string,
  parent: Parent
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(PARENT_KEY, JSON.stringify(parent));
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(PARENT_KEY);
}

// ---------------------------------------------------------------------------
// Google sign-in helper (non-hook portion)
// ---------------------------------------------------------------------------

/**
 * Given a Google ID token obtained via AuthSession, exchange it with the
 * backend and persist the returned session.
 *
 * The actual AuthSession hook (`useAuthRequest`) must live inside a
 * React component; this function handles everything *after* the token
 * is obtained.
 */
export async function exchangeGoogleToken(
  googleIdToken: string
): Promise<AuthResponse> {
  const authResponse = await apiAuthWithGoogle(googleIdToken);
  await storeAuthData(authResponse.token, authResponse.parent);
  return authResponse;
}
