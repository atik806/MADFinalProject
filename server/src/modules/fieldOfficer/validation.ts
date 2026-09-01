export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

export const requireUuid = (value: unknown, field: string): string => {
  if (!isUuid(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }
  return value;
};

export const requireText = (value: unknown, field: string, maxLength = 255): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }
  return text;
};

export const optionalText = (value: unknown, field: string, maxLength = 255): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return requireText(value, field, maxLength);
};

export const parsePage = (value: unknown, fallback: number, field: string): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
};

export const parseIsoDate = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a valid date`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date`);
  }
  return date.toISOString();
};

export const optionalBoolean = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
};

export const optionalStringArray = (value: unknown, field: string, maxItems = 50): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of up to ${maxItems} strings`);
  }
  return value.map((item) => item.trim());
};

// Only expose messages produced by this module's validation/business rules.
// Supabase/Auth errors can contain schema details, so unexpected messages are
// replaced with a stable generic response at the controller boundary.
export const safeErrorMessage = (error: unknown, fallback: string): string => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  if (/must be|required|invalid|contains invalid|no updatable|already|not assigned|not active|not found|cannot be|is already|only draft|only field-verified|must be submitted|can no longer|is already forwarded/i.test(message)) {
    return message;
  }
  return fallback;
};
