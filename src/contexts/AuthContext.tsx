import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { Href } from 'expo-router';
import { DEMO_USERS } from '@/data/auth';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    dispatch({ type: 'LOGIN_START' });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const found = DEMO_USERS.find(
      (u) => u.identifier === identifier && u.password === password,
    );

    if (!found) {
      dispatch({ type: 'LOGIN_ERROR' });
      throw new Error('Invalid credentials');
    }

    dispatch({ type: 'LOGIN_SUCCESS', user: found.user });
    return found.user;
  }, []);

  const logout = useCallback(() => {
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
