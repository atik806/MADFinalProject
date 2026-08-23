import { Request, Response } from 'express';
import * as profileService from './profile.service';

export const getFarmerProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await profileService.getProfile(req.user.id);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch farmer profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await profileService.updateProfile(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Farmer profile updated successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to update farmer profile' });
  }
};
