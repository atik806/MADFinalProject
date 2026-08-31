import { Router } from 'express';
import * as transactionController from './transactions.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { farmerOnly } from '../../../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

router.get('/', transactionController.getAllTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', transactionController.createTransaction);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;
