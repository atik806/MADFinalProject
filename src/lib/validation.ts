// Canonical form-validation helpers for the SOFOL app.
//
// Before this module, phone / NID / email / amount rules were re-implemented
// (inconsistently) in every screen — the phone check alone had three different
// regexes. Every form now imports from here so the rules agree and the error
// copy stays in one place (translation keys live in constants/translations.ts).

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

// Bangladeshi mobile number. Accepts the local form (01XXXXXXXXX / 1XXXXXXXXX)
// and the +880 / 880 forms; whitespace and dashes are ignored. The server
// normalises to E.164 on save (see normalizeBdPhone below for the client copy).
const BD_PHONE_RE = /^(?:\+?880)?1[3-9]\d{8}$|^01[3-9]\d{8}$/;

export function isBdPhone(value: string): boolean {
  return BD_PHONE_RE.test(String(value).replace(/[\s-]/g, ''));
}

// Normalises any accepted phone form to `01XXXXXXXXX` (11 digits). Returns the
// stripped input unchanged when it does not look like a BD number so callers
// can still surface a validation error.
export function normalizeBdPhone(value: string): string {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880')) return `0${digits.slice(3)}`;
  if (digits.startsWith('01')) return digits;
  if (digits.startsWith('1') && digits.length === 10) return `0${digits}`;
  return digits;
}

// Bangladeshi NID: legacy 10-digit or smart-card 17-digit, digits only.
export function isFarmerNid(value: string): boolean {
  const v = String(value).trim();
  return /^\d{10}$/.test(v) || /^\d{17}$/.test(v);
}

// Live-validation state for a typed field. `idle` means "not enough input to
// judge yet" (no error shown); `valid` / `invalid` are only meaningful once the
// value is long enough to be evaluated against the canonical rule.
export type FieldStatus = 'idle' | 'valid' | 'invalid';

// Progressive status for the farmer NID field. A 10-digit value is judged
// immediately; a value between 10 and 17 digits stays `idle` because it may
// still grow into a valid 17-digit number; anything past 17 digits that is not
// valid can never become valid, so it is marked `invalid` right away.
export function nidFieldStatus(value: string): FieldStatus {
  const v = String(value ?? '').trim();
  if (v.length === 0) return 'idle';
  if (v.length < 10) return 'idle';
  if (v.length < 17) return isFarmerNid(v) ? 'valid' : 'idle';
  return isFarmerNid(v) ? 'valid' : 'invalid';
}

// Progressive status for the Bangladeshi mobile field. The shortest accepted
// form is 10 digits (1XXXXXXXXX), so values shorter than that remain `idle`.
export function bdPhoneFieldStatus(value: string): FieldStatus {
  const v = String(value ?? '').trim();
  if (v.length === 0) return 'idle';
  if (v.length < 10) return 'idle';
  return isBdPhone(v) ? 'valid' : 'invalid';
}

// Officer NID check is deliberately looser (8–20 digits) — officers are
// provisioned by an admin who may key in a service ID, not always a real NID.
export function isOfficerNid(value: string): boolean {
  return /^\d{8,20}$/.test(String(value).trim());
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

// ---------------------------------------------------------------------------
// Numbers & money
// ---------------------------------------------------------------------------

// Amount bounds (BDT). Kept generous — these guard against fat-finger and
// overflow input, not against policy limits (the bank officer sets those).
export const MIN_LOAN_AMOUNT = 1_000;
export const MAX_LOAN_AMOUNT = 10_000_000;
export const MAX_TRANSACTION_AMOUNT = 100_000_000;
export const MAX_LAND_ACRES = 10_000;
export const MAX_FAMILY_MEMBERS = 30;

// Parses a user-typed amount ("1,20,000", " 5000 ") to a number. Returns NaN
// when the string is not a clean number so callers branch on Number.isFinite.
export function parseAmount(value: string): number {
  const cleaned = String(value).replace(/,/g, '').trim();
  if (cleaned === '' || !/^\d*\.?\d+$/.test(cleaned)) return NaN;
  return Number(cleaned);
}

export function isPositiveNumber(value: string): boolean {
  const n = parseAmount(value);
  return Number.isFinite(n) && n > 0;
}

export function isNonNegativeNumber(value: string): boolean {
  const n = parseAmount(value);
  return Number.isFinite(n) && n >= 0;
}

export function isPositiveInteger(value: string): boolean {
  const v = String(value).trim();
  return /^\d+$/.test(v) && Number(v) > 0;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

// Strict YYYY-MM-DD. Rejects impossible dates (2026-02-30) by round-tripping
// through Date.
export function isIsoDate(value: string): boolean {
  const v = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === v;
}

// A YYYY-MM-DD date that is today or later (for scheduling forward-dated events
// like field visits).
export function isTodayOrFuture(value: string): boolean {
  if (!isIsoDate(value)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value.trim()}T00:00:00`).getTime() >= today.getTime();
}

// Parses a date of birth typed in any of the formats the app's placeholders
// suggest — YYYY-MM-DD, MM/DD/YYYY or DD/MM/YYYY (the last two are
// disambiguated: a value > 12 in the first slot is treated as the day).
// Returns a timestamp, or NaN when the string is not a real calendar date.
export function parseLooseDate(value: string): number {
  const v = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const slash = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(v);
  let y: number, m: number, d: number;
  if (iso) {
    [, y, m, d] = iso.map(Number) as unknown as [string, number, number, number];
  } else if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    y = Number(slash[3]);
    if (a > 12) { d = a; m = b; } else { m = a; d = b; }
  } else {
    return NaN;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return NaN;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return NaN;
  return date.getTime();
}

// A date of birth that is in the past and within a plausible human age range
// (14–120 years) — the platform is for adult farmers. Accepts every format
// parseLooseDate handles.
export function isPlausibleDob(value: string): boolean {
  const dob = parseLooseDate(value);
  if (!Number.isFinite(dob)) return false;
  const now = Date.now();
  if (dob >= now) return false;
  const years = (now - dob) / (365.25 * 24 * 60 * 60 * 1000);
  return years >= 14 && years <= 120;
}

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

export function isNonEmpty(value: string): boolean {
  return String(value).trim().length > 0;
}

export function hasMinLength(value: string, min: number): boolean {
  return String(value).trim().length >= min;
}
