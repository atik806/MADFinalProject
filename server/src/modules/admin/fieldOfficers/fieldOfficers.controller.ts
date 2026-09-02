import { Request, Response } from 'express';
import * as service from './fieldOfficers.service';
import { safeErrorMessage } from '../users/validation';

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await service.listFieldOfficers({
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.district === 'string' ? { district: req.query.district } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Field officers fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch field officers' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Field officer id is required' });
    }
    const data = await service.getFieldOfficerById(String(id));
    return res.status(200).json({
      success: true,
      message: 'Field officer fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: status === 404 ? safeErrorMessage(error, 'Failed to fetch field officer') : 'Failed to fetch field officer' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const profile = (req as any).profile ?? null;
    const data = await service.createFieldOfficerByAdmin(req.body, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(201).json({
      success: true,
      message: 'Field officer created successfully',
      data,
    });
  } catch (error: any) {
    const msg = safeErrorMessage(error, 'Failed to create field officer');
    const status = /already (been )?registered/i.test(msg) ? 409 : 400;
    return res.status(status).json({ message: msg });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Field officer id is required' });
    }
    const profile = (req as any).profile ?? null;
    const data = await service.updateFieldOfficer(String(id), req.body, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(200).json({
      success: true,
      message: 'Field officer updated successfully',
      data,
    });
  } catch (error: any) {
    const msg = safeErrorMessage(error, 'Failed to update field officer');
    const status = /not found/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: msg });
  }
};

export const setStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Field officer id is required' });
    }
    const { status } = req.body ?? {};
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const profile = (req as any).profile ?? null;
    const data = await service.setFieldOfficerStatus(String(id), status, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(200).json({
      success: true,
      message: `Field officer status set to ${status}`,
      data,
    });
  } catch (error: any) {
    const msg = safeErrorMessage(error, 'Failed to update status');
    const status = /not found/i.test(msg) ? 404 : 500;
    return res.status(status).json({ message: msg });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Field officer id is required' });
    }
    const { newPassword } = req.body ?? {};
    const profile = (req as any).profile ?? null;
    await service.resetFieldOfficerPassword(String(id), newPassword, {
      id: req.user.id,
      name: profile?.name_en ?? req.user.user_metadata?.full_name ?? null,
    });
    return res.status(200).json({
      success: true,
      message: 'Field officer password reset successfully',
    });
  } catch (error: any) {
    const msg = safeErrorMessage(error, 'Failed to reset password');
    const status = /not found/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: msg });
  }
};
