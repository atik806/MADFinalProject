import { Request, Response } from 'express';
import * as service from './bankOfficers.service';
import { safeErrorMessage } from '../users/validation';

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await service.listBankOfficers({
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Bank officers fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch bank officers' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = (req as any).profile ?? null;
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await service.createBankOfficerByAdmin(body, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(201).json({
      success: true,
      message: 'Bank officer created successfully',
      data,
    });
  } catch (error: any) {
    // Only this module's own validation messages pass through; the parked
    // schema surfaces raw Postgres 42703 text that must not reach clients.
    const message = safeErrorMessage(error, 'Failed to create bank officer');
    const status = /required|must be|already registered/i.test(message) ? 400 : 500;
    return res.status(status).json({ message });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Bank officer id is required' });
    }
    const data = await service.getBankOfficerById(String(id));
    return res.status(200).json({
      success: true,
      message: 'Bank officer fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: status === 404 ? safeErrorMessage(error, 'Failed to fetch bank officer') : 'Failed to fetch bank officer' });
  }
};

export const setStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Bank officer id is required' });
    }
    const { status } = req.body ?? {};
    if (!service.BANK_OFFICER_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${service.BANK_OFFICER_STATUSES.join(', ')}`,
      });
    }
    const profile = (req as any).profile ?? null;
    const data = await service.setBankOfficerStatus(String(id), status, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(200).json({
      success: true,
      message: `Bank officer status set to ${status}`,
      data,
    });
  } catch (error: any) {
    const httpStatus = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(httpStatus).json({ message: httpStatus === 404 ? safeErrorMessage(error, 'Failed to update bank officer status') : 'Failed to update bank officer status' });
  }
};
