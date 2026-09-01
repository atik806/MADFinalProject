import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import creditRoutes from './credit/credit.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import loanRoutes from './loans/loans.routes';
import notificationRoutes from './notifications/notifications.routes';
import profileRoutes from './profile/profile.routes';
import transactionRoutes from './transactions/transactions.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/me', profileRoutes);

router.use('/credit', creditRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/loans', loanRoutes);
router.use('/transactions', transactionRoutes);

router.use('/notifications', notificationRoutes);

export default router;
