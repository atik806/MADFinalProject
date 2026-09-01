import { Router } from 'express';
import * as creditController from './credit.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { farmerOnly } from '../../../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

router.get('/', creditController.getCreditProfile);

export default router;
