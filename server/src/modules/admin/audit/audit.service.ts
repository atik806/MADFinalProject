import { supabaseAdmin } from '../../../config/supabase';

// ------------------------------------------------------------------
// Audit logging
// ------------------------------------------------------------------
// Every privileged action (admin/officer create, update, status change,
// login, etc.) is recorded here: who did what, when, to which target.
// recordAuditLog is intentionally best-effort and NEVER throws — an audit
// failure must never break the operation it is recording. Callers invoke it
// as `void recordAuditLog(...)`.

export interface AuditLogEntry {
  actorId: string | null;
  actorRole?: string;
  actorName?: string | null;
  action: string;
  module?: string;
  targetId?: string | null;
  targetType?: string | null;
  status?: 'success' | 'failure' | string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const recordAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const row = {
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      actor_name: entry.actorName ?? null,
      action: entry.action,
      module: entry.module ?? null,
      target_id: entry.targetId ?? null,
      target_type: entry.targetType ?? null,
      status: entry.status ?? 'success',
      details: entry.details ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    };

    const { error } = await supabaseAdmin.from('audit_logs').insert(row);
    if (error) {
      // Non-fatal: the audit_logs table may not exist yet (run admin.sql),
      // or the actor row may be gone. Warn and move on.
      console.warn('recordAuditLog failed (non-fatal):', error.message);
    }
  } catch (err) {
    console.warn('recordAuditLog threw (non-fatal):', err);
  }
};

// ------------------------------------------------------------------
// Reading the audit trail (admin-only)
// ------------------------------------------------------------------

export interface ListAuditLogsFilters {
  actorId?: string;
  module?: string;
  status?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export const listAuditLogs = async (filters: ListAuditLogsFilters) => {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.module) query = query.eq('module', filters.module);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.action) {
    const term = filters.action.replace(/[%_]/g, '\\$&');
    query = query.ilike('action', `%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    // 42P01 = undefined_table: audit_logs has not been created yet (run
    // admin.sql). Degrade to an empty page rather than erroring the admin UI.
    if ((error as any).code === '42P01') {
      return { items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } };
    }
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
