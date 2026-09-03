import { Request, Response } from 'express';
import * as service from './loans.service';

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await service.listLoans({
      ...(typeof req.query.search === 'string' ? { search: req.query.search } : {}),
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.verificationStatus === 'string'
        ? { verificationStatus: req.query.verificationStatus }
        : {}),
      ...(typeof req.query.fieldOfficerId === 'string' ? { fieldOfficerId: req.query.fieldOfficerId } : {}),
      ...(typeof req.query.farmerId === 'string' ? { farmerId: req.query.farmerId } : {}),
      ...(typeof req.query.from === 'string' ? { from: req.query.from } : {}),
      ...(typeof req.query.to === 'string' ? { to: req.query.to } : {}),
      ...(req.query.page ? { page: Number(req.query.page) } : {}),
      ...(req.query.pageSize ? { pageSize: Number(req.query.pageSize) } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Loans fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch loans' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Loan id is required' });
    }
    const data = await service.getLoanById(String(id));
    return res.status(200).json({
      success: true,
      message: 'Loan fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: error?.message ?? 'Failed to fetch loan' });
  }
};
