import { Request, Response } from 'express';
import * as loansService from './loans.service';
import { isUuid, parsePage, safeErrorMessage } from '../validation';

const officerContext = (req: Request) => ({
  id: req.user?.id ?? '',
  name: req.user?.user_metadata?.full_name ?? null,
});

const VALIDATION_ERROR = /must be|required|invalid|no updatable|is invalid|only draft|only field-verified|must be submitted|already forwarded|can no longer/i;
const NOT_FOUND = /not found|not assigned|not active/i;

const statusFor = (error: any): number => {
  const msg = error?.message ?? '';
  if (NOT_FOUND.test(msg)) return 404;
  if (VALIDATION_ERROR.test(msg)) return 400;
  return 500;
};

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await loansService.listLoanApplications(req.user.id, {
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.verificationStatus === 'string' ? { verificationStatus: req.query.verificationStatus } : {}),
      ...(typeof req.query.farmerId === 'string' ? { farmerId: req.query.farmerId } : {}),
      ...(req.query.page ? { page: parsePage(req.query.page, 1, 'page') } : {}),
      ...(req.query.pageSize ? { pageSize: parsePage(req.query.pageSize, 20, 'pageSize') } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Loan applications fetched successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    const status = /must be a positive integer|Invalid application status|Invalid verification status|farmerId must be a valid UUID/i.test(msg) ? 400 : 500;
    return res.status(status).json({ message: status === 400 ? safeErrorMessage(error, 'Failed to fetch loan applications') : 'Failed to fetch loan applications' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const data = await loansService.getLoanApplication(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Loan application fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to fetch loan application' : safeErrorMessage(error, 'Loan application not found') });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { farmerId, title, amount, duration, purpose, installmentType, emi, interest, date } = body;
    if (!farmerId) {
      return res.status(400).json({ message: 'farmerId is required' });
    }
    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }
    if (!amount) {
      return res.status(400).json({ message: 'amount is required' });
    }
    if (!duration) {
      return res.status(400).json({ message: 'duration is required' });
    }
    if (!purpose) {
      return res.status(400).json({ message: 'purpose is required' });
    }
    if (!installmentType) {
      return res.status(400).json({ message: 'installmentType is required' });
    }
    const data = await loansService.createLoanApplication(
      req.user.id,
      { farmerId, title, amount, duration, purpose, installmentType, emi, interest, date },
      officerContext(req),
    );
    return res.status(201).json({
      success: true,
      message: 'Loan application draft created successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to create loan application' : safeErrorMessage(error, 'Failed to create loan application') });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const data = await loansService.updateLoanApplication(req.user.id, String(id), req.body ?? {}, officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Loan application draft updated successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to update loan application' : safeErrorMessage(error, 'Failed to update loan application') });
  }
};

export const submit = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const data = await loansService.submitLoanApplication(req.user.id, String(id), officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Loan application submitted successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to submit loan application' : safeErrorMessage(error, 'Failed to submit loan application') });
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await loansService.verifyLoanApplication(req.user.id, String(id), body, officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Loan application verification recorded',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to verify loan application' : safeErrorMessage(error, 'Failed to verify loan application') });
  }
};

export const forward = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await loansService.forwardLoanApplication(req.user.id, String(id), body, officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Loan application forwarded to bank',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({ message: status === 500 ? 'Failed to forward loan application' : safeErrorMessage(error, 'Failed to forward loan application') });
  }
};
