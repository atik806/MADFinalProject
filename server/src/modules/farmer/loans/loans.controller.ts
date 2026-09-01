import { Request, Response } from 'express';
import * as loanService from './loans.service';
import { safeErrorMessage } from '../validation';
import { supabase } from '../../../config/supabase';

// Status mapping mirrors the field-officer module: validation/business-rule
// failures -> 400, missing-or-foreign loans -> 404, anything else -> 500.
const statusFor = (message: string): number => {
  if (/not found/i.test(message)) return 404;
  if (/must be|required|is required|invalid|characters or fewer|greater than 0|non-negative/i.test(message)) return 400;
  return 500;
};

export const getLoans = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await loanService.getLoans(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Loans fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: safeErrorMessage(error, 'Failed to fetch loans') });
  }
};

export const getLoanById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await loanService.getLoanById(req.user.id, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: 'Loan fetched successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to fetch loan');
    return res.status(statusFor(message)).json({ message });
  }
};

export const applyForLoan = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Farmer display name for the audit log entry.
    const { data: profile } = await supabase
      .from('profiles')
      .select('name_en')
      .eq('id', req.user.id)
      .maybeSingle();
    const data = await loanService.applyForLoan(req.user.id, req.body, profile?.name_en ?? null);
    return res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to apply for loan');
    return res.status(statusFor(message)).json({ message });
  }
};
