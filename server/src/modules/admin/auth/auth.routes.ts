import { NextFunction, Request, Response, Router } from 'express';
import * as authController from './auth.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

// Guards the idempotent admin seed. It performs privileged writes and
// enumerates auth users, so it must not be openly callable in production:
// require the ADMIN_SEED_TOKEN shared secret via the x-seed-token header.
// When the token is unset it stays available only outside production
// (local bootstrapping).
const seedGuard = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.ADMIN_SEED_TOKEN;
    if (expected) {
        if (req.get('x-seed-token') === expected) return next();
        return res.status(403).json({ message: 'Forbidden' });
    }
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(403).json({ message: 'Seed endpoint is disabled. Set ADMIN_SEED_TOKEN to enable it.' });
};

// Public — no token needed.
router.post('/login', authController.login);
// Idempotent admin seed. Useful when the .env was just rotated or the
// database was wiped. Returns the same shape as login.
router.post('/seed', seedGuard, authController.reseed);

// Authenticated admin routes.
router.get('/me', authenticateUser, adminOnly, authController.getMe);
router.post('/change-password', authenticateUser, adminOnly, authController.changePassword);

export default router;
