import { Request, Response } from 'express';

// Clamp a caller-supplied month window to a sane range — the services
// issue one count query per month, so an unbounded value is a cheap DoS.
const parseMonths = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 6;
  return Math.min(Math.max(Math.trunc(n), 1), 24);
};
import * as dashboardService from './dashboard.service';

export const getStats = async (_req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    return res.status(200).json({
      success: true,
      message: 'Admin dashboard stats fetched',
      data: stats,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch dashboard stats' });
  }
};

export const getRegistrationTrend = async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getFarmerRegistrationTrend(parseMonths(req.query.months));
    return res.status(200).json({
      success: true,
      message: 'Registration trend fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch registration trend' });
  }
};

export const getLoanAnalytics = async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getLoanAnalytics(parseMonths(req.query.months));
    return res.status(200).json({
      success: true,
      message: 'Loan analytics fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch loan analytics' });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const data = await dashboardService.getRecentActivity(Number.isFinite(limit) ? limit : 10);
    return res.status(200).json({
      success: true,
      message: 'Recent activity fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch recent activity' });
  }
};

export const getOverview = async (_req: Request, res: Response) => {
  try {
    const [stats, registrationTrend, loanAnalytics, recentActivity] = await Promise.all([
      dashboardService.getDashboardStats(),
      dashboardService.getFarmerRegistrationTrend(6),
      dashboardService.getLoanAnalytics(6),
      dashboardService.getRecentActivity(10),
    ]);
    return res.status(200).json({
      success: true,
      message: 'Admin overview fetched',
      data: { stats, registrationTrend, loanAnalytics, recentActivity },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch admin overview' });
  }
};
