import { Router } from 'express';
import * as controller from './fieldOfficers.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';
import { adminMutationLimiter } from '../../../middleware/security.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/', controller.list);
router.get('/:id', controller.getById);
// Mutations carry the tighter admin limiter — credential provisioning and
// status changes are the highest-value targets for a stolen admin token.
router.post('/', adminMutationLimiter, controller.create);
router.put('/:id', adminMutationLimiter, controller.update);
router.patch('/:id/status', adminMutationLimiter, controller.setStatus);
router.post('/:id/reset-password', adminMutationLimiter, controller.resetPassword);

export default router;
