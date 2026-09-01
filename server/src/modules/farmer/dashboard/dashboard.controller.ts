import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';
import { safeErrorMessage } from '../validation';

// GET /api/farmer/dashboard — aggregate landing payload for the authenticated
// farmer: profile, credit score, recent transactions/loans and totals.
//
// Brought onto the shared `{ success, message, data }` contract; it was the
// last farmer endpoint returning a bare payload object. It also used to pass
// `error.message` straight through, which could surface raw Supabase/Postgres
// text to the client — errors now go through safeErrorMessage like every other
// farmer handler.
export const getFarmerDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await dashboardService.getDashboard(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Farmer dashboard fetched successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to fetch farmer dashboard');
    const status = /not found/i.test(message) ? 404 : 500;
    return res.status(status).json({ message });
  }
};
