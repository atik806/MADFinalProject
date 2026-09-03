// Shared native validators for the Bank Officer module. Mirrors the Field
// Officer module's approach (no validation library) so the two review flows
// behave and fail identically.

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

export const toPositiveNumber = (value: unknown, field: string): number => {
  const n = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : NaN;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${field} must be a number greater than 0`);
  }
  return n;
};

// The statuses a bank officer may set. 'draft'/'pending' belong to the field
// officer stage and 'active'/'completed' belong to disbursement/repayment,
// which this module does not implement — so neither is accepted here.
export const BANK_DECISION_STATUSES = ['approved', 'rejected'] as const;
export type BankDecisionStatus = (typeof BANK_DECISION_STATUSES)[number];

export const requireDecisionStatus = (value: unknown): BankDecisionStatus => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!BANK_DECISION_STATUSES.includes(status as BankDecisionStatus)) {
    throw new Error(`Invalid decision status. Allowed: ${BANK_DECISION_STATUSES.join(', ')}`);
  }
  return status as BankDecisionStatus;
};

// Statuses an application can legitimately have once it reaches the bank.
// Used to validate the queue's ?status= filter.
export const BANK_QUEUE_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'active', 'completed'] as const;

export const requireQueueStatusFilter = (value: unknown): string => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!BANK_QUEUE_STATUSES.includes(status as (typeof BANK_QUEUE_STATUSES)[number])) {
    throw new Error(`Invalid application status. Allowed: ${BANK_QUEUE_STATUSES.join(', ')}`);
  }
  return status;
};

const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;

export const requireVerificationStatusFilter = (value: unknown): string => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!VERIFICATION_STATUSES.includes(status as (typeof VERIFICATION_STATUSES)[number])) {
    throw new Error(`Invalid verification status. Allowed: ${VERIFICATION_STATUSES.join(', ')}`);
  }
  return status;
};

// Only messages produced by this module's own validation/business rules are
// echoed to the client. Supabase errors can leak schema details, so anything
// unrecognised is replaced with a stable generic message at the controller
// boundary.
export const safeErrorMessage = (error: unknown, fallback: string): string => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  if (
    /must be|must not|required|invalid|no updatable|not found|already|cannot be|can no longer|only forwarded|has already been decided|is not active/i.test(
      message,
    )
  ) {
    return message;
  }
  return fallback;
};
