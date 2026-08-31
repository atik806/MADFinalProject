import { Request, Response } from 'express';
import * as visitsService from './visits.service';
import { isUuid, parsePage, safeErrorMessage } from '../validation';

const officerContext = (req: Request) => ({
  id: req.user?.id ?? '',
  name: req.user?.user_metadata?.full_name ?? null,
});

export const list = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await visitsService.listVisits(req.user.id, {
      ...(typeof req.query.status === 'string' ? { status: req.query.status } : {}),
      ...(typeof req.query.farmerId === 'string' ? { farmerId: req.query.farmerId } : {}),
       ...(req.query.page ? { page: parsePage(req.query.page, 1, 'page') } : {}),
       ...(req.query.pageSize ? { pageSize: parsePage(req.query.pageSize, 20, 'pageSize') } : {}),
    });
    return res.status(200).json({
      success: true,
      message: 'Visits fetched successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to fetch visits';
    const isValidationError = /must be|invalid visit status/i.test(msg);
    return res.status(isValidationError ? 400 : 500).json({ message: isValidationError ? msg : 'Failed to fetch visits' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { farmerId, visitDate, scheduledDate, purpose, notes, location, visitType } = body;
    if (!farmerId) {
      return res.status(400).json({ message: 'farmerId is required' });
    }
    const data = await visitsService.scheduleVisit(req.user.id, { farmerId, visitDate, scheduledDate, purpose, notes, location, visitType }, officerContext(req));
    return res.status(201).json({
      success: true,
      message: 'Visit scheduled successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to schedule visit';
    const status = /not assigned|not found/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Failed to schedule visit') });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Visit id must be a valid UUID' });
    const data = await visitsService.getVisit(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Visit fetched successfully',
      data,
    });
  } catch (error: any) {
    const status = /not found|not owned/i.test(error?.message ?? '') ? 404 : 500;
    return res.status(status).json({ message: status === 404 ? safeErrorMessage(error, 'Visit not found') : 'Failed to fetch visit' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Visit id must be a valid UUID' });
    const data = await visitsService.updateVisit(req.user.id, String(id), req.body ?? {}, officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Visit updated successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to update visit';
    const status = /not found|not owned/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Failed to update visit') });
  }
};

export const complete = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Visit id must be a valid UUID' });
    const data = await visitsService.markVisitCompleted(req.user.id, String(id), officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Visit marked as completed',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to complete visit';
    const status = /not found|not owned/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Failed to complete visit') });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ message: 'Visit id must be a valid UUID' });
    const data = await visitsService.cancelVisit(req.user.id, String(id), officerContext(req));
    return res.status(200).json({
      success: true,
      message: 'Visit cancelled',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to cancel visit';
    const status = /not found|not owned/i.test(msg) ? 404 : 400;
    return res.status(status).json({ message: safeErrorMessage(error, 'Failed to cancel visit') });
  }
};
