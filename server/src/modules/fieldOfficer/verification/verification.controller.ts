import { Request, Response } from 'express';
import * as verificationService from './verification.service';
import { isUuid, parsePage, safeErrorMessage } from '../validation';

const verificationInput = (body: Record<string, any>) => ({
  ...(body.status !== undefined ? { status: body.status } : {}),
  ...(body.notes !== undefined ? { notes: body.notes } : {}),
  ...(body.verificationType !== undefined ? { verificationType: body.verificationType } : {}),
  ...(body.photoUrls !== undefined ? { photoUrls: body.photoUrls } : {}),
  ...(body.documentsChecked !== undefined ? { documentsChecked: body.documentsChecked } : {}),
  ...(body.farmerPresent !== undefined ? { farmerPresent: body.farmerPresent } : {}),
  ...(body.landVerified !== undefined ? { landVerified: body.landVerified } : {}),
  ...(body.documentsVerified !== undefined ? { documentsVerified: body.documentsVerified } : {}),
});

export const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'Farmer id must be a valid UUID' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (!body.status) {
      return res.status(400).json({ message: 'Verification status is required' });
    }
    const data = await verificationService.verifyFarmer(
      req.user.id,
      String(id),
      verificationInput(body),
      { id: req.user.id, name: req.user.user_metadata?.full_name ?? null },
    );
    return res.status(200).json({
      success: true,
      message: 'Farmer verification recorded successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Verification failed';
    const status = /not assigned|not found/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Verification failed') });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Verification id must be a valid UUID' });
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const data = await verificationService.updateVerification(
      req.user.id,
      String(id),
      verificationInput(body),
      { id: req.user.id, name: req.user.user_metadata?.full_name ?? null },
    );
    return res.status(200).json({ success: true, message: 'Farmer verification updated successfully', data });
  } catch (error: any) {
    const msg = error?.message ?? 'Verification update failed';
    const status = /not found|not owned|not assigned/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Verification update failed') });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await verificationService.listVerificationsForOfficer(req.user.id, {
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
       ...(req.query.page ? { page: parsePage(req.query.page, 1, 'page') } : {}),
       ...(req.query.pageSize ? { pageSize: parsePage(req.query.pageSize, 20, 'pageSize') } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Verification history fetched successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to fetch verification history';
    const isValidationError = /must be a positive integer|invalid verification status/i.test(msg);
    return res.status(isValidationError ? 400 : 500).json({ message: isValidationError ? msg : 'Failed to fetch verification history' });
  }
};
