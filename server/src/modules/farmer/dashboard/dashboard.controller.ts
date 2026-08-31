import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';

export const getFarmerDashboard = async (req: Request, res: Response) => {
  try {
    const data = await dashboardService.getDashboard(req.user?.id);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message ?? 'Failed to fetch farmer dashboard',
    });
  }
};
