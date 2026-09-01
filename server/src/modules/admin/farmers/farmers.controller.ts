import { Request, Response } from 'express';
import * as farmersService from './farmers.service';
import { safeErrorMessage } from '../users/validation';

const NOT_FOUND = /not found/i;
const VALIDATION_ERROR = /must be|required|invalid/i;

const statusFor = (error: any): number => {
  const msg = error?.message ?? '';
  if (NOT_FOUND.test(msg)) return 404;
  if (VALIDATION_ERROR.test(msg)) return 400;
  return 500;
};

// GET /api/admin/farmers — searchable, filterable farmer directory.
export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await farmersService.listFarmers({
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.district === 'string' ? { district: req.query.district } : {}),
      ...(typeof req.query.verification === 'string' ? { verification: req.query.verification } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Farmers fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to fetch farmers' : safeErrorMessage(error, 'Failed to fetch farmers'),
    });
  }
};

// GET /api/admin/farmers/:id — full farmer profile + verification history.
export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await farmersService.getFarmerById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Farmer fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to fetch farmer' : safeErrorMessage(error, 'Farmer not found'),
    });
  }
};
