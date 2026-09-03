import { Router } from 'express';
import * as controller from './bankOfficers.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';
import { adminMutationLimiter } from '../../../middleware/security.middleware';

const router = Router();

// Provisioning staff accounts is admin-only: guards are applied here so the
// routes below can never be reached unauthenticated.
router.use(authenticateUser, adminOnly);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', adminMutationLimiter, controller.create);
router.patch('/:id/status', adminMutationLimiter, controller.setStatus);

export default router;
