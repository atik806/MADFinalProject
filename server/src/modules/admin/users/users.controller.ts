import { Request, Response } from 'express';
import * as service from './users.service';
import type { UserRoleFilter } from './users.service';

const VALID_ROLES: UserRoleFilter[] = ['farmer', 'field_officer', 'bank_officer', 'admin', 'all'];

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const roleParam = (typeof req.query.role === 'string' ? req.query.role : 'all') as UserRoleFilter;
    const role: UserRoleFilter = VALID_ROLES.includes(roleParam) ? roleParam : 'all';

    const data = await service.listUsers({
      role,
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.district === 'string' ? { district: req.query.district } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch users' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User id is required' });
    }
    const data = await service.getUserById(String(id));
    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: error?.message ?? 'Failed to fetch user' });
  }
};

export const counts = async (_req: Request, res: Response) => {
  try {
    const data = await service.getRoleCounts();
    return res.status(200).json({
      success: true,
      message: 'User counts fetched',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch user counts' });
  }
};
