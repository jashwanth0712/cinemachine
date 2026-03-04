import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { Parent, KidProfile } from '../types';
import * as auth from '../services/auth';
import * as api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  parent: Parent | null;
  kidProfiles: KidProfile[];
  currentKid: KidProfile | null;
  hasPickedProfile: boolean;
  token: string | null;
  signIn: (googleIdToken: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setCurrentKid: (kid: KidProfile) => void;
  createKidProfile: (
    name: string,
    avatarEmoji: string
  ) => Promise<KidProfile>;
  refreshKidProfiles: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [parent, setParent] = useState<Parent | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [kidProfiles, setKidProfiles] = useState<KidProfile[]>([]);
  const [currentKid, setCurrentKidState] = useState<KidProfile | null>(null);
  const [hasPickedProfile, setHasPickedProfile] = useState(false);

  const isAuthenticated = !!parent && !!token;

  const setCurrentKid = useCallback((kid: KidProfile) => {
    setCurrentKidState(kid);
    setHasPickedProfile(true);
  }, []);

  // -----------------------------------------------------------------------
  // Restore session on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await auth.getStoredToken();
        const storedParent = await auth.getStoredParent();

        if (storedToken && storedParent) {
          setToken(storedToken);
          setParent(storedParent);

          // Fetch kid profiles — if the token is rejected (401),
          // clear the session so the user is sent back to login.
          try {
            const profiles = await api.getKidProfiles(storedToken);
            setKidProfiles(profiles);
            if (profiles.length === 1) {
              setCurrentKidState(profiles[0]);
              setHasPickedProfile(true);
            }
            // If 2+ profiles, leave currentKid null so the picker shows
          } catch (err: any) {
            const is401 =
              err?.status === 401 ||
              err?.response?.status === 401 ||
              err?.message?.includes('401');
            if (is401) {
              console.warn('Stored token rejected (401) — signing out');
              await auth.signOut();
              setParent(null);
              setToken(null);
              return;
            }
            // API might be unreachable — session data is still valid
            console.warn('Failed to fetch kid profiles on restore');
          }
        }
      } catch {
        // SecureStore read failure — treat as not authenticated
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // -----------------------------------------------------------------------
  // Sign in
  // -----------------------------------------------------------------------

  const signIn = useCallback(
    async (googleIdToken: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        const authResponse = await auth.exchangeGoogleToken(googleIdToken);

        setParent(authResponse.parent);
        setToken(authResponse.token);
        setKidProfiles(authResponse.kid_profiles);

        if (authResponse.kid_profiles.length === 1) {
          setCurrentKidState(authResponse.kid_profiles[0]);
          setHasPickedProfile(true);
        }
        // If 2+ profiles, leave currentKid null so the picker shows

        return true;
      } catch (err) {
        console.error('Sign in failed:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // Sign out
  // -----------------------------------------------------------------------

  const handleSignOut = useCallback(async () => {
    await auth.signOut();
    setParent(null);
    setToken(null);
    setKidProfiles([]);
    setCurrentKidState(null);
    setHasPickedProfile(false);
  }, []);

  // -----------------------------------------------------------------------
  // Kid profiles
  // -----------------------------------------------------------------------

  const handleCreateKidProfile = useCallback(
    async (name: string, avatarEmoji: string): Promise<KidProfile> => {
      if (!token) throw new Error('Not authenticated');
      const kid = await api.createKidProfile(token, name, avatarEmoji);
      setKidProfiles((prev) => [...prev, kid]);
      setCurrentKidState(kid);
      setHasPickedProfile(true);
      return kid;
    },
    [token]
  );

  const refreshKidProfiles = useCallback(async () => {
    if (!token) return;
    try {
      const profiles = await api.getKidProfiles(token);
      setKidProfiles(profiles);
      // If the current kid was removed, fall back to the first profile
      if (currentKid && !profiles.find((p) => p.id === currentKid.id)) {
        setCurrentKidState(profiles.length > 0 ? profiles[0] : null);
      }
    } catch {
      console.warn('Failed to refresh kid profiles');
    }
  }, [token, currentKid]);

  // -----------------------------------------------------------------------
  // Value
  // -----------------------------------------------------------------------

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    parent,
    kidProfiles,
    currentKid,
    hasPickedProfile,
    token,
    signIn,
    signOut: handleSignOut,
    setCurrentKid,
    createKidProfile: handleCreateKidProfile,
    refreshKidProfiles,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
