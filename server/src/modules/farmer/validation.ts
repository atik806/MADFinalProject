// Shared validation helpers for the farmer module. Mirrors the field-officer
// module's validation.ts so both role modules follow the same rules and the
// same safe-error conventions.

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

export const toFiniteNumber = (value: unknown, field: string): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`${field} must be a number`);
  }
  return n;
};

// The frontend stores amounts as signed numbers: income > 0 and expense < 0
// (the Transactions screen filters on the sign). Enforce that convention.
export const requireSignedAmount = (value: unknown, category: string): number => {
  const n = toFiniteNumber(value, 'amount');
  if (n === 0) {
    throw new Error('amount must not be zero');
  }
  if (category === 'income' && n <= 0) {
    throw new Error('amount must be a positive number for income transactions');
  }
  if (category === 'expense' && n >= 0) {
    throw new Error('amount must be a negative number for expense transactions');
  }
  return n;
};

export const requireTransactionCategory = (value: unknown): string => {
  const category = String(value ?? '').trim().toLowerCase();
  if (category !== 'income' && category !== 'expense') {
    throw new Error('Invalid category. Must be either "income" or "expense"');
  }
  return category;
};

// Transaction dates are stored as short display strings ("18 Jun 2024") by
// the existing frontend convention — validate presence and length only.
export const requireTransactionDate = (value: unknown): string => {
  return requireText(value, 'date', 50);
};

export const INSTALLMENT_TYPES = ['monthly', 'seasonal'] as const;

export const requireInstallmentType = (value: unknown): string => {
  const type = String(value ?? '').trim().toLowerCase();
  if (!INSTALLMENT_TYPES.includes(type as (typeof INSTALLMENT_TYPES)[number])) {
    throw new Error(`installmentType is invalid. Allowed: ${INSTALLMENT_TYPES.join(', ')}`);
  }
  return type;
};

// Only expose messages produced by this module's validation/business rules.
// Supabase/Auth errors can contain schema details, so unexpected messages are
// replaced with a stable generic response at the controller boundary.
export const safeErrorMessage = (error: unknown, fallback: string): string => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  if (/must be|required|is required|invalid|already|not found|zero|positive number|negative number|characters or fewer/i.test(message)) {
    return message;
  }
  return fallback;
};
