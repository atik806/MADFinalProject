import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';
import { adminMutationLimiter } from '../../../middleware/security.middleware';

const router = Router();

// The whole directory is admin-only. Guards run before any handler is
// registered, so no user-management endpoint can be reached unauthenticated.
router.use(authenticateUser, adminOnly);

router.get('/', usersController.list);
router.get('/:id', usersController.getById);
// Status flips lock people out of the platform — tight limiter.
router.patch('/:id/status', adminMutationLimiter, usersController.setStatus);

export default router;
