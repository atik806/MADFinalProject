import { Router } from 'express';
import * as profileController from './profile.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { fieldOfficerOnly } from '../../../middleware/fieldOfficer.middleware';

const router = Router();

router.use(authenticateUser, fieldOfficerOnly);

router.get('/me', profileController.getMe);
router.put('/me', profileController.updateMe);

export default router;
