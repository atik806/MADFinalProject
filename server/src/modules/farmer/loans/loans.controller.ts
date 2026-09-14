import { Request, Response } from 'express';
import * as loanService from './loans.service';

//get all the loans
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
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch loans' });
  }
};


//get loan by id
export const getLoanById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Loan id is required' });
    }
    const data = await loanService.getLoanById(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Loan fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(404).json({ message: error?.message ?? 'Loan not found' });
  }
};


//apply for a new loan

export const applyForLoan = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await loanService.applyForLoan(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      data,
    });
  } catch (error: any) {
    const status = error?.message?.includes('Missing') ? 400 : 500;
    return res.status(status).json({ message: error?.message ?? 'Failed to apply for loan' });
  }
};

//repay one EMI on an approved loan
export const repayLoan = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Loan id is required' });
    }
    const data = await loanService.repayLoan(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Loan repayment recorded successfully',
      data,
    });
  } catch (error: any) {
    const msg = error?.message ?? '';
    const status = /not found/i.test(msg) ? 404 : /only approved|already been fully repaid|no EMI amount/i.test(msg) ? 400 : 500;
    return res.status(status).json({ message: msg || 'Failed to record repayment' });
  }
};
