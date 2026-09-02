import { Request, Response } from 'express';
import * as auditService from './audit.service';

// GET /api/admin/audit — paginated audit trail with optional filters:
//   ?actorId= &module= &status= &action= &page= &pageSize=
export const list = async (req: Request, res: Response) => {
  try {
    const data = await auditService.listAuditLogs({
      ...(typeof req.query.actorId === 'string' ? { actorId: req.query.actorId } : {}),
      ...(typeof req.query.module === 'string' ? { module: req.query.module } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.action === 'string' ? { action: req.query.action } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Audit logs fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
};
