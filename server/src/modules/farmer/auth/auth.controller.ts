import { Request, Response } from 'express';
import * as authService from './auth.service';

//register a new farmer (full app registration payload)
export const register = async (req: Request, res: Response) => {
  try {
    const data = await authService.registerFarmer(req.body);
    return res.status(201).json({ success: true, message: 'Farmer registered successfully', data });
  } catch (error: any) {
    const status = /already registered/.test(error?.message) ? 409 : 400;
    return res.status(status).json({ message: error?.message ?? 'Registration failed' });
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
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: data.session?.access_token,
      user: data.user,
    });
  } catch (error: any) {
    return res.status(401).json({ message: error?.message ?? 'Login failed' });
  }
};

//registerd user can get his profile details
export const getMe = async (req: Request, res: Response) => {
  return res.status(200).json({ success: true, data: req.user ?? null });
};
