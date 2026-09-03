import { Platform } from 'react-native';

// Central API client for the SOFOL backend.
//
// Conventions:
//   - Base URL: EXPO_PUBLIC_API_URL env var wins (physical devices on a LAN);
//     Android emulator falls back to 10.0.2.2 (host loopback alias);
//     everything else falls back to localhost.
//   - The bearer token lives in module state and is set/cleared by
//     AuthContext on login/logout. It is intentionally NOT persisted to
//     device storage in this milestone (no storage dependency is installed),
//     so closing the app ends the session — documented in AI_README.
//   - Errors are normalized to ApiError so screens never see raw fetch or
//     Supabase internals.

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL?.length)
    ? String(process.env.EXPO_PUBLIC_API_URL)
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 30000;

// Normalized API error. `status` is the HTTP status when a response arrived;
// undefined means the request never got a response (offline/unreachable).
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidation() {
    return this.status === 400;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get isNetwork() {
    return this.status === undefined;
  }
}

// Registered by AuthContext on mount. When any authenticated request comes
// back 401 the session is definitively dead (invalid/expired token), so the
// auth state must be cleared instead of leaving the app falsely
// authenticated with every subsequent request failing.
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

// Maps raw failure modes to a user-facing message. Backend validation errors
// arrive as { message } and are shown as-is (they are written for users);
// anything unexpected is replaced so internals never leak.
const normalizeError = (data: any, status?: number): ApiError => {
  const backendMessage = typeof data?.message === 'string' && data.message.length > 0 ? data.message : null;

  if (status === 401) {
    return new ApiError(backendMessage ?? 'Your session has expired. Please log in again.', status);
  }
  if (status === 403) {
    return new ApiError(backendMessage ?? 'You do not have permission to perform this action.', status);
  }
  if (status === 404) {
    return new ApiError(backendMessage ?? 'The requested item was not found.', status);
  }
  if (status === 400) {
    return new ApiError(backendMessage ?? 'Please check the entered information and try again.', status);
  }
  if (status === 409) {
    return new ApiError(backendMessage ?? 'This record already exists. Please review and try again.', status);
  }
  if (status === 429) {
    return new ApiError('Too many requests. Please wait a moment and try again.', status);
  }
  if (status !== undefined && status >= 500) {
    return new ApiError('The server could not complete the request. Please try again.', status);
  }
  if (status === undefined) {
    return new ApiError('Cannot reach the SOFOL server. Check your connection and that the server is running.');
  }
  return new ApiError(backendMessage ?? 'The request failed. Please try again.', status);
};

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ApiError('The request timed out. Is the server running and reachable?');
    }
    throw normalizeError({}, undefined);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const normalized = normalizeError(data, res.status);
    // A 401 on any authenticated request means the token is dead. Clear the
    // stale token immediately so the app cannot stay falsely authenticated
    // and re-dispatch the login state via the registered handler.
    if (res.status === 401) {
      authToken = null;
      unauthorizedHandler?.();
    }
    throw normalized;
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  put: <T = any>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = any>(path: string, body: any) => apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
