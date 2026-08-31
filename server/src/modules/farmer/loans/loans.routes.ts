import { Router } from 'express';
import * as loanController from './loans.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { farmerOnly } from '../../../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

router.get('/', loanController.getLoans);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.applyForLoan);

export default router;
