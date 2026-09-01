import { Request, Response } from 'express';
import * as profileService from './profile.service';
import { safeErrorMessage } from '../validation';

// GET /api/farmer/me (alias of /api/farmer/profile)
// Returns the authenticated farmer's own profile. The user id is always
// derived from the Bearer token, never from the request body.
export const getFarmerProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await profileService.getProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Farmer profile fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: safeErrorMessage(error, 'Failed to fetch farmer profile') });
  }
};

// PUT /api/farmer/me — updates the farmer's own editable profile fields.
// Privileged columns (is_verified, credit_score, farmer_id, role, status,
// member_since) are filtered out by PROFILE_FIELD_MAP and can never be set
// through this endpoint.
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
    return res.status(500).json({ message: safeErrorMessage(error, 'Failed to update farmer profile') });
  }
};
