import { Router } from 'express';
import * as profileController from './profile.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { bankOfficerOnly } from '../../../middleware/bankOfficer.middleware';

const router = Router();

router.use(authenticateUser, bankOfficerOnly);

router.get('/me', profileController.getMe);
router.put('/me', profileController.updateMe);

export default router;
