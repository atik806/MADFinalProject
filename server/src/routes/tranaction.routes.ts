import { Router } from 'express';
import { getTransactionById } from '../controllers/transaction.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { farmerOnly } from '../middleware/role.middleware';


const router = Router();
router.use(authenticateUser);
router.use(farmerOnly);

router.get("/id:", getTransactionById);


