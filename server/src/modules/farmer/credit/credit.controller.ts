import { Request, Response } from 'express';
import * as creditService from './credit.service';
import { safeErrorMessage } from '../validation';

// GET /api/farmer/credit — read-only credit profile of the authenticated
// farmer. Verified fields (is_verified, credit_score, verification history)
// and system-derived loan aggregates are never writable through this module.
export const getCreditProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await creditService.getCreditProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Credit profile fetched successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to fetch credit profile');
    const status = /not found/i.test(message) ? 404 : 500;
    return res.status(status).json({ message });
  }
};
