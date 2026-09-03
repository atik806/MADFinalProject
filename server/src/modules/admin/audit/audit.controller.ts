import { Request, Response } from 'express';
import { supabaseAdmin } from '../../../config/supabase';

export interface ListAuditLogsFilters {
  module?: string;
  status?: string;
  actorId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const listAuditLogs = async (req: Request) => {
  const filters: ListAuditLogsFilters = {
    ...(typeof req.query.module === 'string' ? { module: req.query.module } : {}),
    ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
    ...(typeof req.query.actorId === 'string' ? { actorId: req.query.actorId } : {}),
    ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
    ...(typeof req.query.from === 'string' ? { from: req.query.from } : {}),
    ...(typeof req.query.to === 'string' ? { to: req.query.to } : {}),
    ...(req.query.page ? { page: Number(req.query.page) } : {}),
    ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
  };

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.module && filters.module !== 'All') {
    query = query.eq('module', filters.module);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId);
  }
  if (filters.from) {
    query = query.gte('created_at', filters.from);
  }
  if (filters.to) {
    query = query.lte('created_at', filters.to);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  let items = data ?? [];
  if (filters.search) {
    const term = filters.search.toLowerCase();
    items = items.filter(
      (i: any) =>
        (i.action ?? '').toLowerCase().includes(term) ||
        (i.actor_name ?? '').toLowerCase().includes(term) ||
        (i.target_id ?? '').toLowerCase().includes(term) ||
        (i.module ?? '').toLowerCase().includes(term),
    );
  }

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: count ?? items.length,
      totalPages: Math.max(1, Math.ceil((count ?? items.length) / pageSize)),
    },
  };
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await listAuditLogs(req);
    return res.status(200).json({
      success: true,
      message: 'Audit logs fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch audit logs' });
  }
};

export const getModuleSummary = async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('module, status');
    if (error) {
      throw new Error(error.message);
    }

    const summary: Record<string, { total: number; success: number; pending: number; failed: number }> = {};
    (data ?? []).forEach((row: any) => {
      const key = row.module ?? 'System';
      if (!summary[key]) {
        summary[key] = { total: 0, success: 0, pending: 0, failed: 0 };
      }
      summary[key].total += 1;
      if (row.status === 'success') summary[key].success += 1;
      else if (row.status === 'pending') summary[key].pending += 1;
      else if (row.status === 'failed') summary[key].failed += 1;
    });

    return res.status(200).json({
      success: true,
      message: 'Module summary fetched',
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch audit summary' });
  }
};

export const listAdminNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 100);

    let query = supabaseAdmin
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Admin notifications fetched',
      data: data ?? [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Notification id is required' });
    }
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', String(id));
    if (error) {
      throw new Error(error.message);
    }
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to mark notification' });
  }
};

export const markAllNotificationsRead = async (_req: Request, res: Response) => {
  try {
    if (!_req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ read: true })
      .eq('read', false);
    if (error) {
      throw new Error(error.message);
    }
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to mark notifications' });
  }
};
