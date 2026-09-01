import { Request, Response } from 'express';
import * as reviewService from './review.service';
import { isUuid, parsePage, safeErrorMessage } from '../validation';

const officerContext = (req: Request) => ({
  id: req.user?.id ?? '',
  name: req.user?.user_metadata?.full_name ?? null,
});

// A not-forwarded application is reported as "not found" by the service, so it
// maps to 404 here and stays indistinguishable from a nonexistent id.
const NOT_FOUND = /not found/i;
const VALIDATION_ERROR =
  /must be|must not|required|invalid|already been decided|already under review|only forwarded|only field-verified/i;

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
    const data = await reviewService.listReviewQueue({
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.verificationStatus === 'string'
        ? { verificationStatus: req.query.verificationStatus }
        : {}),
      ...(typeof req.query.farmerId === 'string' ? { farmerId: req.query.farmerId } : {}),
      ...(req.query.page ? { page: parsePage(req.query.page, 1, 'page') } : {}),
      ...(req.query.pageSize ? { pageSize: parsePage(req.query.pageSize, 20, 'pageSize') } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Loan review queue fetched successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    const status = /must be a positive integer|Invalid application status|Invalid verification status|farmerId must be a valid UUID/i.test(msg)
      ? 400
      : 500;
    return res.status(status).json({
      message: status === 400 ? safeErrorMessage(error, 'Failed to fetch loan review queue') : 'Failed to fetch loan review queue',
    });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const data = await reviewService.getReviewApplication(String(id));
    return res.status(200).json({
      success: true,
      message: 'Loan application fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to fetch loan application' : safeErrorMessage(error, 'Loan application not found'),
    });
  }
};

export const review = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const data = await reviewService.markUnderReview(req.user.id, String(id), officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Loan application moved to review',
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to move loan application to review' : safeErrorMessage(error, 'Failed to move loan application to review'),
    });
  }
};

export const decide = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Loan id must be a valid UUID' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (!body.status) {
      return res.status(400).json({ message: 'status is required' });
    }
    const data = await reviewService.recordDecision(req.user.id, String(id), body, officerContext(req));
    return res.status(200).json({
      success: true,
      message: `Loan application ${data.status}`,
      data,
    });
  } catch (error: any) {
    const status = statusFor(error);
    return res.status(status).json({
      message: status === 500 ? 'Failed to record loan decision' : safeErrorMessage(error, 'Failed to record loan decision'),
    });
  }
};
