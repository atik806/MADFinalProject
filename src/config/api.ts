import { Platform } from 'react-native';

// Central API configuration for talking to the Sofol backend server.
//   - Android emulator: http://10.0.2.2:3000 (10.0.2.2 = host machine)
//   - iOS simulator / web: http://localhost:3000
//   - Physical device: replace with your machine's LAN IP, e.g. http://192.168.x.x:3000
//
// Set EXPO_PUBLIC_API_URL in a .env file to override (e.g. when running on a
// physical device against a machine on your LAN). Expo inlines EXPO_PUBLIC_*
// vars at build time.
const ENV_API_URL =
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;

export const API_BASE_URL =
  ENV_API_URL && ENV_API_URL.length > 0
    ? ENV_API_URL
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 30000;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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
      throw new Error('Request timed out. Is the server running and reachable?');
    }
    throw new Error(e?.message ?? 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body: any) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
