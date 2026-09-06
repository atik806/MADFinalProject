import { Request, Response } from 'express';
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
    return res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

// Clamp the months window to [1, 24] so a hostile or fat-fingered query
// cannot drive an unbounded time-series loop on the dashboard.
const clampMonths = (raw: unknown): number => {
  const n = Number(raw);
  const base = Number.isFinite(n) ? n : 6;
  return Math.min(Math.max(Math.trunc(base), 1), 24);
};

export const getRegistrationTrend = async (req: Request, res: Response) => {
  try {
    const months = clampMonths(req.query.months);
    const data = await dashboardService.getFarmerRegistrationTrend(months);
    return res.status(200).json({
      success: true,
      message: 'Registration trend fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch registration trend' });
  }
};

export const getLoanAnalytics = async (req: Request, res: Response) => {
  try {
    const months = clampMonths(req.query.months);
    const data = await dashboardService.getLoanAnalytics(months);
    return res.status(200).json({
      success: true,
      message: 'Loan analytics fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch loan analytics' });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Math.trunc(Number(req.query.limit)), 1), 20);
    const data = await dashboardService.getRecentActivity(Number.isFinite(limit) ? limit : 10);
    return res.status(200).json({
      success: true,
      message: 'Recent activity fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch recent activity' });
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
    return res.status(500).json({ message: 'Failed to fetch admin overview' });
  }
};
