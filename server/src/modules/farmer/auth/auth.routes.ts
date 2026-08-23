import { Router } from 'express';
import multer from 'multer';
import * as authController from './auth.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';

const router = Router();

const uploadMiddleware = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/upload', uploadMiddleware.single('file'), authController.upload);
router.get('/me', authenticateUser, authController.getMe);

export default router;
