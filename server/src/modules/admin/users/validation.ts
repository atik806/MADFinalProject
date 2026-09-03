// Shared validators for the admin user-management surface. Follows the
// module-validation convention (farmer / fieldOfficer / bankOfficer
// validation.ts): native checks only, no validation library.

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

export const requireUuid = (value: unknown, field: string): string => {
  if (!isUuid(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }
  return value;
};

export const parsePage = (value: unknown, fallback: number, field: string): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
};

// Bounded, escaped for the PostgREST ilike pattern characters % and _.
export const sanitizeSearch = (value: unknown, field: string, maxLength = 100): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  const term = value.trim();
  if (term.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer`);
  }
  return term;
};

// Roles the admin directory recognizes. 'admin' is deliberately included so
// the directory can show every account, but admin status changes are refused
// server-side (see USER_STATUS_RULES) — locking out the only admin account is
// never an allowed action.
export const USER_ROLES = ['farmer', 'field_officer', 'bank_officer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const requireRoleFilter = (value: unknown): UserRole => {
  const role = String(value ?? '').trim().toLowerCase();
  if (!USER_ROLES.includes(role as UserRole)) {
    throw new Error(`Invalid role. Allowed: ${USER_ROLES.join(', ')}`);
  }
  return role as UserRole;
};

// Account-status transitions the admin may set. Farmers additionally carry
// 'pending' (the registration default) — an admin may set a pending farmer to
// active, but pending itself is registration machinery, not an admin action.
export const ADMIN_SETTABLE_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export const USER_STATUS_RULES: Record<UserRole, readonly AdminSettableStatus[]> = {
  farmer: ADMIN_SETTABLE_STATUSES,
  field_officer: ADMIN_SETTABLE_STATUSES,
  bank_officer: ADMIN_SETTABLE_STATUSES,
  admin: [], // never settable: the env-configured primary admin must not be lockable
};

export const requireStatusForRole = (role: UserRole, value: unknown): AdminSettableStatus => {
  const status = String(value ?? '').trim().toLowerCase();
  if (!ADMIN_SETTABLE_STATUSES.includes(status as AdminSettableStatus)) {
    throw new Error(`Invalid status. Allowed: ${ADMIN_SETTABLE_STATUSES.join(', ')}`);
  }
  if (USER_STATUS_RULES[role].length === 0) {
    throw new Error('Admin account status cannot be changed through this endpoint');
  }
  return status as AdminSettableStatus;
};

// Only expose messages produced by this module's validation/business rules;
// unexpected (Supabase) errors are replaced with a stable generic message at
// the controller boundary.
export const safeErrorMessage = (error: unknown, fallback: string): string => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';
  if (/must be|required|invalid|cannot be|not found|no longer|must not/i.test(message)) {
    return message;
  }
  return fallback;
};
