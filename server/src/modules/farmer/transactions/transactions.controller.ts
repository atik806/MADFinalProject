import { Request, Response } from 'express';
import * as transactionService from './transactions.service';

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
    return res.status(500).json({ message: error?.message ?? 'Failed to fetch transactions' });
  }
};

export const getTransactionById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Transaction id is required' });
    }
    const data = await transactionService.getTransactionById(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Transaction fetched successfully',
      data,
    });
  } catch (error: any) {
    return res.status(404).json({ message: error?.message ?? 'Transaction not found' });
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
    const status =
      error?.message?.includes('Invalid category') || error?.message?.includes('Missing') ? 400 : 500;
    return res.status(status).json({ message: error?.message ?? 'Failed to create transaction' });
  }
};

export const updateTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Transaction id is required' });
    }
    const data = await transactionService.updateTransaction(req.user.id, String(id), req.body);
    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data,
    });
  } catch (error: any) {
    return res.status(404).json({ message: error?.message ?? 'Transaction not found' });
  }
};

export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: 'Transaction id is required' });
    }
    const data = await transactionService.deleteTransaction(req.user.id, String(id));
    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      data,
    });
  } catch (error: any) {
    return res.status(404).json({ message: error?.message ?? 'Transaction not found' });
  }
};
