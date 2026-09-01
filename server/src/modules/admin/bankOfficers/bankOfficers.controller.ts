import { Request, Response } from 'express';
import * as service from './bankOfficers.service';

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
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch bank officers' });
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
    const message = error?.message ?? 'Failed to create bank officer';
    const status = /required|must be|already registered/i.test(message) ? 400 : 500;
    return res.status(status).json({ message });
  }
};
