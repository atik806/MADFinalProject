import { Router } from 'express';
import { createTransaction, deleteTransaction, getAllTransactions, getTransactionById, updateTransaction } from '../controllers/transaction.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { farmerOnly } from '../middleware/role.middleware';


const router = Router();
router.use(authenticateUser);
router.use(farmerOnly);
router.get("/", getAllTransactions);
router.get("/id:", getTransactionById);

router.post("/", createTransaction);

router.put("/:id", updateTransaction);

router.delete("/:id", deleteTransaction);
export default router;



