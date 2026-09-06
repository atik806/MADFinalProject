import { Router } from 'express';
import multer from 'multer';
import * as authController from './auth.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { authLimiter } from '../../../middleware/security.middleware';

const router = Router();

const uploadMiddleware = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

// Credential endpoints carry the brute-force limiter; authenticated
// routes above do not (the token check already gates those).
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/reset-password', authLimiter, authController.resetPassword);
// Upload is authenticated: registration photos can contain PII and must not
// be writable by anonymous callers.
router.post('/upload', authenticateUser, uploadMiddleware.single('file'), authController.upload);
router.get('/me', authenticateUser, authController.getMe);

export default router;
