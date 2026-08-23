import { Request, Response } from 'express';
import * as authService from './auth.service';

//register a new farmer
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const data = await authService.registerFarmer({ email, password, full_name, phone });
    return res.status(201).json({ success: true, message: 'Farmer registered successfully', data });
  } catch (error: any) {
    return res.status(400).json({ message: error?.message ?? 'Registration failed' });
  }
};


//login

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const data = await authService.loginFarmer(email, password);
    return res.status(200).json({ success: true, message: 'Login successful', data });
  } catch (error: any) {
    return res.status(401).json({ message: error?.message ?? 'Login failed' });
  }
};

//registerd user can get his profile details
export const getMe = async (req: Request, res: Response) => {
  return res.status(200).json({ success: true, data: req.user ?? null });
};
