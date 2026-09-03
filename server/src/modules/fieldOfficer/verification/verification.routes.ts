import { Router } from 'express';
import * as verificationController from './verification.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { fieldOfficerOnly } from '../../../middleware/fieldOfficer.middleware';

const router = Router();

router.use(authenticateUser, fieldOfficerOnly);

router.get('/', verificationController.list);
router.post('/farmers/:id', verificationController.create);
router.put('/:id', verificationController.update);

export default router;
