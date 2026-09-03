import { Request, Response } from 'express';
import * as profileService from './profile.service';
import { safeErrorMessage } from '../validation';

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await profileService.getSelfProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Bank officer profile fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({
      message: status === 404 ? 'Bank officer profile not found' : 'Failed to fetch bank officer profile',
    });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await profileService.updateSelfProfile(req.user.id, body);
    return res.status(200).json({
      success: true,
      message: 'Bank officer profile updated successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    const status = /not found/i.test(msg) ? 404 : /no updatable|must be|required/i.test(msg) ? 400 : 500;
    return res.status(status).json({
      message: status === 500 ? 'Failed to update bank officer profile' : safeErrorMessage(error, 'Failed to update bank officer profile'),
    });
  }
};
