import { supabaseAdmin } from '../../../config/supabase';
import { recordAuditLog } from '../audit/audit.service';
import {
  AdminSettableStatus,
  UserRole,
  parsePage,
  requireRoleFilter,
  requireStatusForRole,
  requireUuid,
  sanitizeSearch,
} from './validation';

// ------------------------------------------------------------------
// Admin user directory — read + status across ALL roles
// ------------------------------------------------------------------
// The admin previously had per-officer endpoints (field-officers,
// bank-officers) but no way to see or moderate farmers or the full account
// list. This module is the unified directory over the SAME `profiles` table:
// no new tables, no duplication of the officer endpoints — those keep their
// richer payloads (assignments, counts) for their screens.

// Columns every account has that are safe to show in a directory listing.
// NID and auth-internal values are deliberately excluded from list rows.
const DIRECTORY_COLUMNS = 'id, role, status, name_en, name_bn, email, phone, district, village, is_verified, credit_score, farmer_id, employee_id, designation, bank_name, member_since, created_at';

export interface ListUsersFilters {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// Escapes PostgREST ilike wildcards so a search for "100%" matches literally.
const escapeIlike = (term: string) => term.replace(/[%_]/g, '\\$&');

export const listUsers = async (filters: ListUsersFilters) => {
  const page = parsePage(filters.page ?? 1, 1, 'page');
  const pageSize = Math.min(Math.max(parsePage(filters.pageSize ?? 20, 20, 'pageSize'), 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select(DIRECTORY_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.role) {
    query = query.eq('role', requireRoleFilter(filters.role));
  }

  // Any status value is filterable (pending/active/inactive/suspended) — the
  // directory shows reality, it does not enforce the transition rules.
  if (filters.status) {
    query = query.eq('status', String(filters.status).trim().toLowerCase());
  }

  if (filters.search) {
    const term = escapeIlike(sanitizeSearch(filters.search, 'search'));
    const pattern = `%${term}%`;
    query = query.or(
      `name_en.ilike.${pattern},name_bn.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},farmer_id.ilike.${pattern},employee_id.ilike.${pattern}`,
    );
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    items: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
};

export const getUserById = async (rawId: unknown) => {
  const id = requireUuid(rawId, 'User id');

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('User not found');
  }
  return data;
};

// setUserStatus: the admin's account-level kill switch. Enforces the
// per-role transition rules from validation.ts BEFORE touching the row, so an
// admin account can never be suspended through this endpoint (the primary
// admin logs in via ADMIN_EMAIL — losing that account has no recovery path
// short of a manual DB edit).
//
// Status semantics downstream: 'inactive'/'suspended' are both rejected by
// the role guards (farmerOnly / fieldOfficerOnly / bankOfficerOnly) on every
// request, so a still-valid token stops working immediately.
export const setUserStatus = async (
  rawId: unknown,
  rawStatus: unknown,
  adminContext: { id: string; name: string | null },
) => {
  const id = requireUuid(rawId, 'User id');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, status, name_en')
    .eq('id', id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }
  if (!profile) {
    throw new Error('User not found');
  }

  const role = String(profile.role ?? '').trim().toLowerCase() as UserRole;
  const status = requireStatusForRole(role, rawStatus);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('User not found');
  }

  void recordAuditLog({
    actorId: adminContext.id,
    actorRole: 'admin',
    actorName: adminContext.name ?? 'Administrator',
    action: `User status set to ${status}`,
    module: 'Admin',
    targetId: id,
    targetType: 'user',
    status: 'success',
    details: { role, previousStatus: profile.status ?? null, newStatus: status },
  });

  return data;
};
