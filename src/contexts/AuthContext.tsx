import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { Href } from 'expo-router';
import { api, ApiError, setAuthToken } from '../lib/api';
import type { LoginResponse } from '../lib/api-types';

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
};

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGIN_ERROR' }
  | { type: 'LOGOUT' };

type AuthContextValue = AuthState & {
  isLoggedIn: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
};

// Backend profiles.role values → the frontend's role union used for routing.
// The mapping is one-way here; the backend remains authoritative for every
// authorization decision (its role guards read profiles server-side).
const BACKEND_ROLE_MAP: Record<string, UserRole> = {
  farmer: 'farmer',
  admin: 'admin',
  bank_officer: 'bank-officer',
  'bank-officer': 'bank-officer',
  field_officer: 'field-officer',
  'field-officer': 'field-officer',
};

export const toUserRole = (backendRole: unknown): UserRole =>
  BACKEND_ROLE_MAP[String(backendRole ?? '').trim().toLowerCase()] ?? 'farmer';

// Builds the frontend User from a login response. The role always comes from
// the server-resolved profile — never from anything the client submitted.
const userFromLogin = (payload: LoginResponse): User => ({
  id: String(payload?.user?.id ?? payload?.profile?.id ?? ''),
  name:
    payload?.profile?.name_en ??
    payload?.profile?.name_bn ??
    payload?.user?.user_metadata?.full_name ??
    'SOFOL User',
  email: payload?.user?.email ?? payload?.profile?.email ?? undefined,
  phone: payload?.user?.phone ?? payload?.profile?.phone ?? undefined,
  role: toUserRole(payload?.profile?.role),
});

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return { user: action.user, isLoading: false };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false };
    case 'LOGOUT':
      return { user: null, isLoading: false };
    default:
      return state;
  }
}

const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

// All staff (field officer / bank officer) and farmer accounts use the shared
// login endpoint: it resolves the identifier (email / NID / phone) to the
// account and returns the profile with its server-side role. The admin uses
// its own endpoint with different credential semantics.
const trySharedLogin = (identifier: string, password: string) =>
  api.post<LoginResponse>('/api/farmer/auth/login', { identifier, password });

const tryAdminLogin = (identifier: string, password: string) =>
  api.post<LoginResponse>('/api/admin/auth/login', { identifier, password });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    dispatch({ type: 'LOGIN_START' });

    // Officer/farmer accounts never collide with admin credentials (staff
    // emails are synthetic nid@sofol.local), but a wrong-role identifier
    // must not lock the admin out, so both doors are tried. Only a definitive
    // credential rejection (401) falls through to the admin endpoint —
    // network/server failures surface immediately.
    let payload: LoginResponse | null = null;
    try {
      payload = await trySharedLogin(identifier, password);
    } catch (err) {
      const credentialsRejected = err instanceof ApiError && err.status === 401;
      if (!credentialsRejected) throw err;
      payload = await tryAdminLogin(identifier, password);
    }

    if (!payload?.token) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw new Error('Login did not return a session token');
    }

    // Token first, then state: any later request carries the right header.
    setAuthToken(payload.token);
    const user = userFromLogin(payload);
    dispatch({ type: 'LOGIN_SUCCESS', user });
    return user;
  }, []);

  const logout = useCallback(() => {
    // Clear the token BEFORE the user so no in-flight request keeps it.
    setAuthToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value = useMemo(
    () => ({ ...state, isLoggedIn: !!state.user, login, logout }),
    [state, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
  }
}
