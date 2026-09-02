import { Request, Response } from 'express';
import * as authService from './auth.service';
import * as uploadService from './upload.service';
import { safeErrorMessage } from '../validation';

//register a new farmer (full app registration payload)
export const register = async (req: Request, res: Response) => {
  try {
    const data = await authService.registerFarmer(req.body);
    return res.status(201).json({ success: true, message: 'Farmer registered successfully', data });
  } catch (error: any) {
    // Own validation/duplicate messages pass; raw Supabase errors are masked.
    const msg = safeErrorMessage(error, 'Registration failed');
    const status = /already (been )?registered/i.test(msg) ? 409 : 400;
    return res.status(status).json({ message: msg });
  }
};


//login

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }
    const data = await authService.loginFarmer(identifier, password);
    const profile = await authService.getProfileById(data.user.id).catch(() => null);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: data.session?.access_token,
      user: data.user,
      profile,
    });
  } catch (error: any) {
    // "Invalid login credentials" is ours; raw auth failures are masked.
    return res.status(401).json({ message: safeErrorMessage(error, 'Login failed') });
  }
};

//registerd user can get his profile details
export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = await authService.getProfileById(req.user.id);
    return res.status(200).json({
      success: true,
      data: req.user,
      profile,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

//demo password reset: verify phone/NID exists, then set the new password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({ message: 'Identifier and new password are required' });
    }
    await authService.resetFarmerPassword(identifier, newPassword);
    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    // Only this module's own validation messages pass through.
    return res.status(400).json({ message: safeErrorMessage(error, 'Password reset failed') });
  }
};

//upload a registration photo to supabase storage and return its public url
export const upload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const type = typeof req.body.type === 'string' ? req.body.type : 'misc';
    const url = await uploadService.uploadPhoto(req.file, type);
    return res.status(201).json({ success: true, url });
  } catch (error: any) {
    return res.status(500).json({ message: 'Upload failed' });
  }
};
