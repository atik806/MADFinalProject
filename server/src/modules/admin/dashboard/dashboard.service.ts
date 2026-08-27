import { supabase, supabaseAdmin } from '../../../config/supabase';

const isoDaysAgo = (days: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
};

const safeCount = async (
  query: any,
): Promise<number> => {
  try {
    const { count, error } = await query;
    if (error) {
      console.error('safeCount error:', error);
      return 0;
    }
    console.log('[debug] safeCount -> count:', count);
    return count ?? 0;
  } catch (err) {
    console.error('safeCount threw:', err);
    return 0;
  }
};

export interface DashboardStats {
  totalFarmers: number;
  verifiedFarmers: number;
  pendingFarmers: number;
  totalFieldOfficers: number;
  activeFieldOfficers: number;
  totalLoans: number;
  pendingLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  forwardedLoans: number;
  totalAssignments: number;
  totalVisits: number;
  visitsToday: number;
  pendingVerifications: number;
  recentFarmers: number;
  recentFieldOfficers: number;
  generatedAt: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const [
    totalFarmers,
    verifiedFarmers,
    pendingFarmers,
    totalFieldOfficers,
    activeFieldOfficers,
    totalLoans,
    pendingLoans,
    approvedLoans,
    rejectedLoans,
    forwardedLoans,
    totalAssignments,
    totalVisits,
    pendingVerifications,
    recentFarmers,
    recentFieldOfficers,
  ] = await Promise.all([
    safeCount(() =>
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'farmer'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer')
        .eq('is_verified', true),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer')
        .neq('is_verified', true),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'field_officer'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'field_officer')
        .eq('status', 'active'),
    ),
    safeCount(() => supabaseAdmin.from('loan_applications').select('*', { count: 'exact', head: true })),
    safeCount(() =>
      supabaseAdmin
        .from('loan_applications')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('loan_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('loan_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('loan_applications')
        .select('*', { count: 'exact', head: true })
        .not('forwarded_at', 'is', null),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('field_officer_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ),
    safeCount(() => supabaseAdmin.from('field_visits').select('*', { count: 'exact', head: true })),
    safeCount(() =>
      supabaseAdmin
        .from('farmer_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer')
        .gte('member_since', isoDaysAgo(30)),
    ),
    safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'field_officer')
        .gte('member_since', isoDaysAgo(30)),
    ),
  ]);

  // Visits today (rough UTC range from start of day to end of day).
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  const visitsToday = await safeCount(() =>
    supabaseAdmin
      .from('field_visits')
      .select('*', { count: 'exact', head: true })
      .gte('visit_date', startOfDay.toISOString())
      .lte('visit_date', endOfDay.toISOString()),
  );

  return {
    totalFarmers,
    verifiedFarmers,
    pendingFarmers,
    totalFieldOfficers,
    activeFieldOfficers,
    totalLoans,
    pendingLoans,
    approvedLoans,
    rejectedLoans,
    forwardedLoans,
    totalAssignments,
    totalVisits,
    visitsToday,
    pendingVerifications,
    recentFarmers,
    recentFieldOfficers,
    generatedAt: new Date().toISOString(),
    _reloaded_at: 'VERSION-MARKER-2',
  } as any;
};

export interface RegistrationSeriesPoint {
  label: string; // month label like 'Jan'
  value: number;
}

// Returns farmer registration counts per month for the last `months`
// months. Used by the admin dashboard chart.
export const getFarmerRegistrationTrend = async (months: number = 6): Promise<RegistrationSeriesPoint[]> => {
  const series: RegistrationSeriesPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const monthLabel = d.toLocaleString('en-US', { month: 'short' });

    const count = await safeCount(() =>
      supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'farmer')
        .gte('member_since', start)
        .lt('member_since', end),
    );
    series.push({ label: monthLabel, value: count });
  }

  return series;
};

export interface LoanAnalyticsPoint {
  label: string;
  approved: number;
  pending: number;
}

export const getLoanAnalytics = async (months: number = 6): Promise<LoanAnalyticsPoint[]> => {
  const series: LoanAnalyticsPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const monthLabel = d.toLocaleString('en-US', { month: 'short' });

    const [approved, pending] = await Promise.all([
      safeCount(() =>
        supabaseAdmin
          .from('loan_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', start)
          .lt('created_at', end),
      ),
      safeCount(() =>
        supabaseAdmin
          .from('loan_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gte('created_at', start)
          .lt('created_at', end),
      ),
    ]);

    series.push({ label: monthLabel, approved, pending });
  }

  return series;
};

export interface RecentActivityItem {
  id: string;
  actorName: string;
  action: string;
  module: string;
  status: string;
  createdAt: string;
}

export const getRecentActivity = async (limit: number = 10): Promise<RecentActivityItem[]> => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('id, actor_name, action, module, status, created_at')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error('getRecentActivity error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    actorName: row.actor_name ?? 'System',
    action: row.action,
    module: row.module,
    status: row.status,
    createdAt: row.created_at,
  }));
};
