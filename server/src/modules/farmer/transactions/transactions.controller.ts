import { Request, Response } from 'express';
import * as transactionService from './transactions.service';
import { safeErrorMessage } from '../validation';

// Status mapping mirrors the field-officer module: validation/business-rule
// failures -> 400, missing-or-foreign resources -> 404, anything else -> 500.
const statusFor = (message: string): number => {
  if (/not found/i.test(message)) return 404;
  if (/must be|required|is required|invalid|zero|positive number|negative number|characters or fewer/i.test(message)) return 400;
  return 500;
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await transactionService.getTransactions(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Transactions fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ message: safeErrorMessage(error, 'Failed to fetch transactions') });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await transactionService.getTransactionById(req.user.id, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: 'Transaction fetched successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to fetch transaction');
    return res.status(statusFor(message)).json({ message });
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await transactionService.createTransaction(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to create transaction');
    return res.status(statusFor(message)).json({ message });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await transactionService.updateTransaction(req.user.id, String(req.params.id), req.body);
    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to update transaction');
    return res.status(statusFor(message)).json({ message });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const data = await transactionService.deleteTransaction(req.user.id, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data,
    });
  } catch (error: any) {
    const message = safeErrorMessage(error, 'Failed to delete transaction');
    return res.status(statusFor(message)).json({ message });
  }
};
