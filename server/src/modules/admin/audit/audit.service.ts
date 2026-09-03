import { supabase, supabaseAdmin } from '../../../config/supabase';

export type AuditModule =
  | 'User'
  | 'Loan'
  | 'FieldOfficer'
  | 'BankOfficer'
  | 'System'
  | 'Auth'
  | 'Report';
export type AuditStatus = 'success' | 'pending' | 'failed';

export interface RecordAuditLogInput {
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  action: string;
  module: AuditModule;
  targetId?: string | null;
  targetType?: string | null;
  status?: AuditStatus;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// recordAuditLog: append a single row to audit_logs. Failures here must
// never break the parent operation, so we swallow and log.
export const recordAuditLog = async (input: RecordAuditLogInput) => {
  try {
    const row = {
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? null,
      actor_name: input.actorName ?? null,
      action: input.action,
      module: input.module,
      target_id: input.targetId ?? null,
      target_type: input.targetType ?? null,
      status: input.status ?? 'success',
      details: input.details ?? {},
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    };

    const { error } = await supabaseAdmin.from('audit_logs').insert(row);
    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('recordAuditLog threw:', err);
  }
};

// pushAdminNotification: write a card to the admin_notifications table.
// The admin dashboard notification badge reads from this table.
export const pushAdminNotification = async (params: {
  title: string;
  message: string;
  category?: string;
  severity?: 'info' | 'warning' | 'critical' | 'success';
  actorId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, any>;
}) => {
  try {
    const row = {
      title: params.title,
      message: params.message,
      category: params.category ?? 'system',
      severity: params.severity ?? 'info',
      actor_id: params.actorId ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
      read: false,
    };
    const { error } = await supabaseAdmin.from('admin_notifications').insert(row);
    if (error) {
      console.error('Failed to write admin notification:', error);
    }
  } catch (err) {
    console.error('pushAdminNotification threw:', err);
  }
};
