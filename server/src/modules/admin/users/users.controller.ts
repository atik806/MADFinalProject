import { Request, Response } from 'express';
import * as usersService from './users.service';
import { safeErrorMessage } from './validation';

const adminContext = (req: Request) => ({
  id: req.user?.id ?? '',
  name: req.user?.user_metadata?.full_name ?? null,
});

const NOT_FOUND = /not found/i;
const VALIDATION_ERROR = /must be|required|invalid|cannot be|must not/i;

const statusFor = (error: any): number => {
  const msg = error?.message ?? '';
  if (NOT_FOUND.test(msg)) return 404;
  if (VALIDATION_ERROR.test(msg)) return 400;
  return 500;
};

// GET /api/admin/users — paginated directory across all roles, with role /
// status filters and a name/email/phone/id search.
export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await usersService.listUsers({
      ...(typeof req.query.role === 'string' ? { role: req.query.role } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to fetch users' : safeErrorMessage(error, 'Failed to fetch users'),
    });
  }
};

// GET /api/admin/users/:id — one account, any role.
export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await usersService.getUserById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to fetch user' : safeErrorMessage(error, 'User not found'),
    });
  }
};

// PATCH /api/admin/users/:id/status — activate / deactivate / suspend any
// non-admin account. Admin accounts are refused server-side.
export const setStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User id is required' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await usersService.setUserStatus(id, body.status, adminContext(req));
    return res.status(200).json({
      success: true,
      message: `User status set to ${data.status}`,
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to update user status' : safeErrorMessage(error, 'Failed to update user status'),
    });
  }
};
