import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

// Public — no token needed.
router.post('/login', authController.login);
// Public — idempotent admin seed. Useful when the .env was just rotated
// or the database was wiped. Returns the same shape as login.
router.post('/seed', authController.reseed);

// Authenticated admin routes.
router.get('/me', authenticateUser, adminOnly, authController.getMe);
router.post('/change-password', authenticateUser, adminOnly, authController.changePassword);

export default router;
