import { Request, Response } from 'express';
import * as profileService from './profile.service';
import { safeErrorMessage } from '../validation';

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = await profileService.getSelfProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Field officer profile fetched successfully',
      data: req.user,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch field officer profile' });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = await profileService.updateSelfProfile(req.user.id, req.body ?? {});
    return res.status(200).json({
      success: true,
      message: 'Field officer profile updated successfully',
      profile,
    });
  } catch (error: any) {
    return res.status(400).json({ message: safeErrorMessage(error, 'Failed to update field officer profile') });
  }
};
