import { Request, Response } from 'express';
import * as farmersService from './farmers.service';
import { isUuid, parsePage, safeErrorMessage } from '../validation';

const officerContext = (req: Request) => ({
  id: req.user?.id ?? '',
  name: req.user?.user_metadata?.full_name ?? null,
});

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await farmersService.listAssignedFarmers(req.user.id, {
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(req.query.page ? { page: parsePage(req.query.page, 1, 'page') } : {}),
      ...(req.query.pageSize ? { pageSize: parsePage(req.query.pageSize, 20, 'pageSize') } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Assigned farmers fetched successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to fetch farmers';
    return res.status(/must be a positive integer/i.test(msg) ? 400 : 500).json({ message: /must be a positive integer/i.test(msg) ? msg : 'Failed to fetch farmers' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Farmer id must be a valid UUID' });
    }
    const data = await farmersService.getAssignedFarmer(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Farmer fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not assigned|not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: status === 404 ? safeErrorMessage(error, 'Farmer not found') : 'Failed to fetch farmer' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await farmersService.registerFarmerByOfficer(req.body ?? {}, officerContext(req));
    return res.status(201).json({
      success: true,
      message: 'Farmer registered successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Registration failed';
    const status = /already (been )?registered/i.test(msg) ? 409 : 400;
    return res.status(status).json({ message: status === 409 || status === 400 && /required|must be|password|contains invalid/i.test(msg) ? safeErrorMessage(error, 'Farmer registration failed') : 'Farmer registration failed' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Farmer id must be a valid UUID' });
    }
    const data = await farmersService.updateAssignedFarmer(req.user.id, String(id), req.body ?? {}, officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Farmer updated successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to update farmer';
    const status = /not assigned|not found/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: status === 404 || /no updatable|must be|required|invalid/i.test(msg) ? safeErrorMessage(error, 'Farmer update failed') : 'Farmer update failed' });
  }
};
