import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateUser, authController.getMe);

export default router;
