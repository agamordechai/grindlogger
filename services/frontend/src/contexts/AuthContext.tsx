/**
 * Authentication context.
 *
 * Website (VITE_TARGET=web): social / email sign-in against the backend, session tokens in localStorage.
 * Native app: a single local user, no sign-in (see src/target.ts).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { googleLogin, githubLogin, discordLogin, redditLogin, loginEmail, registerEmail, getCurrentUser, updateProfile as updateProfileApi, deleteAccount as deleteAccountApi } from '../api/client';
import type { User, ProfileUpdate } from '../types/auth';
import { getWeightUnit, setWeightUnit } from '../hooks/useUnits';
import { IS_WEB } from '../target';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (googleIdToken: string) => Promise<void>;
  loginWithGithub: (code: string, redirectUri: string) => Promise<void>;
  loginWithDiscord: (code: string, redirectUri: string) => Promise<void>;
  loginWithReddit: (code: string, redirectUri: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  // Native app: load the single local user (offline, no authentication).
  // Website: validate the stored session token, if any.
  useEffect(() => {
    if (IS_WEB && !localStorage.getItem('access_token')) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        if (IS_WEB) {
          // Token is invalid or expired, clear it
          logout();
        } else {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const storeTokensAndLoadUser = useCallback(async (tokens: { access_token: string; refresh_token: string | null }) => {
    localStorage.setItem('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  }, []);

  const login = useCallback(async (googleIdToken: string) => {
    const tokens = await googleLogin(googleIdToken);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const loginWithGithub = useCallback(async (code: string, redirectUri: string) => {
    const tokens = await githubLogin(code, redirectUri);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const loginWithDiscord = useCallback(async (code: string, redirectUri: string) => {
    const tokens = await discordLogin(code, redirectUri);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const loginWithReddit = useCallback(async (code: string, redirectUri: string) => {
    const tokens = await redditLogin(code, redirectUri);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const tokens = await loginEmail(email, password);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const tokens = await registerEmail(email, name, password);
    await storeTokensAndLoadUser(tokens);
  }, [storeTokensAndLoadUser]);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    const updatedUser = await updateProfileApi(data);
    setUser(updatedUser);
  }, []);

  // The account's unit preference wins over this browser's / device's last choice.
  useEffect(() => {
    if (!user?.units) return;
    const wanted = user.units === 'imperial' ? 'lbs' : 'kg';
    if (getWeightUnit() !== wanted) setWeightUnit(wanted);
  }, [user?.units]);

  // The sync engine changed the local profile (native app): reload it.
  useEffect(() => {
    if (IS_WEB) return;
    const reload = () => void getCurrentUser().then(setUser).catch(() => undefined);
    window.addEventListener('profile-synced', reload);
    return () => window.removeEventListener('profile-synced', reload);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountApi();
    if (IS_WEB) {
      logout();
      return;
    }
    // On-device "reset": wipe all local data, then reload the fresh local user
    // (there is always a single local user — we never sign out to a login screen).
    const refreshed = await getCurrentUser();
    setUser(refreshed);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        loginWithGithub,
        loginWithDiscord,
        loginWithReddit,
        loginWithEmail,
        register,
        logout,
        updateProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
