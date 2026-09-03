import { api, setAuthToken } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

export type UserRole = 'farmer' | 'admin' | 'bank-officer' | 'field-officer';

export type User = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  // True while we restore a saved session on app start. The UI shows a splash
  // until this flips to false so we never flash the landing page for a
  // logged-in user (or a protected screen for a logged-out one).
  isBootstrapping: boolean;
};

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'BOOTSTRAP_DONE' };

type AuthContextValue = AuthState & {
  isLoggedIn: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = 'sofol.auth.v1';

const normalizeRole = (value: unknown): UserRole => {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (raw === 'farmer') return 'farmer';
  if (raw === 'admin') return 'admin';
  if (raw === 'bank-officer' || raw === 'bankofficer') return 'bank-officer';
  if (raw === 'field-officer' || raw === 'fieldofficer') return 'field-officer';
  return 'farmer';
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return { user: action.user, isLoading: false, isBootstrapping: false };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false };
    case 'LOGOUT':
      return { user: null, isLoading: false, isBootstrapping: false };
    case 'BOOTSTRAP_DONE':
      return { ...state, isBootstrapping: false };
    default:
      return state;
  }
}

const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  isBootstrapping: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Builds our app User from a Supabase auth user object (shape returned by both
// the login endpoint and /auth/me).
function buildUser(u: any, fallbackIdentifier?: string): User {
  const metadataRole = u?.user_metadata?.role ?? u?.app_metadata?.role;
  return {
    id: u?.id,
    name: u?.user_metadata?.full_name ?? u?.phone ?? u?.email ?? fallbackIdentifier ?? 'User',
    phone: u?.phone ?? fallbackIdentifier,
    email: u?.email,
    role: normalizeRole(metadataRole),
  };
}

// Auth endpoints per role. The farmer routes are unauthenticated-role-agnostic
// (they only require a valid Supabase session), so they double as the default
// path; officials fall back to their own module endpoint.
const ME_ENDPOINTS = ['/api/farmer/auth/me', '/api/admin/auth/me'] as const;
const LOGIN_ENDPOINTS = ['/api/farmer/auth/login', '/api/admin/auth/login'] as const;

async function fetchMe(knownRole?: string): Promise<{ data: any; profile?: any }> {
  // Try the admin endpoint first when we already know this is an admin session.
  const endpoints =
    normalizeRole(knownRole) === 'admin' ? [...ME_ENDPOINTS].reverse() : [...ME_ENDPOINTS];
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await api.get<{ data: any; profile?: any }>(endpoint);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Session validation failed');
}

async function loginAnyRole(
  identifier: string,
  password: string,
): Promise<{ token: string; user: any; profile?: any }> {
  let lastError: unknown;
  for (const endpoint of LOGIN_ENDPOINTS) {
    try {
      const res = await api.post<{ token: string; user: any; profile?: any }>(endpoint, {
        identifier,
        password,
      });
      if (res?.token && res?.user) return res;
      lastError = new Error('Login failed: invalid server response');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Invalid credentials');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Restore a saved session on mount and validate the token against the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          if (!cancelled) dispatch({ type: 'BOOTSTRAP_DONE' });
          return;
        }
        const saved = JSON.parse(raw) as { token?: string; user?: User };
        if (!saved?.token || !saved?.user) {
          if (!cancelled) dispatch({ type: 'BOOTSTRAP_DONE' });
          return;
        }
        setAuthToken(saved.token);
        // Validate the token is still good. Throws on 401 (expired/invalid) or
        // when the server is unreachable. The farmer `/auth/me` accepts any
        // valid Supabase session; if it rejects (e.g. role-gated later) fall
        // back to the admin endpoint so official sessions still restore.
        const me = await fetchMe(saved.user?.role);
        if (cancelled) return;
        const user = buildUser(me?.data ?? saved.user, saved.user?.phone ?? saved.user?.email);
        user.role = normalizeRole(me?.profile?.role ?? user.role);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: saved.token, user })).catch(() => {});
        dispatch({ type: 'LOGIN_SUCCESS', user });
      } catch {
        // Invalid/expired token or unreachable server → drop the saved session.
        setAuthToken(null);
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        if (!cancelled) dispatch({ type: 'BOOTSTRAP_DONE' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const res = await loginAnyRole(identifier, password);
      setAuthToken(res.token);
      const user = buildUser(res.user, identifier);
      user.role = normalizeRole(res?.profile?.role ?? user.role);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, user })).catch(() => {});
      dispatch({ type: 'LOGIN_SUCCESS', user });
      return user;
    } catch (error: any) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw new Error(error?.message ?? 'Invalid credentials');
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = useMemo(
    () => ({ ...state, isLoggedIn: !!state.user, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRouteForRole(role: UserRole): Href {
  switch (role) {
    case 'farmer':
      return '/view/FarmerDashboard/farmer-dashboard' as Href;
    case 'admin':
      return '/officials/(admin)' as Href;
    case 'bank-officer':
      return '/officials/(bank-officer)' as Href;
    case 'field-officer':
      return '/officials/(field-officer)' as Href;
    default:
      return '/view/FarmerDashboard/farmer-dashboard' as Href;
  }
}
