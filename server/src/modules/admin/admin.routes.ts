import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import auditRoutes from './audit/audit.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import fieldOfficerRoutes from './fieldOfficers/fieldOfficers.routes';
import bankOfficerRoutes from './bankOfficers/bankOfficers.routes';
import loanRoutes from './loans/loans.routes';
import userRoutes from './users/users.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/field-officers', fieldOfficerRoutes);
router.use('/bank-officers', bankOfficerRoutes);
router.use('/users', userRoutes);
router.use('/loans', loanRoutes);
router.use('/audit', auditRoutes); // /audit/logs, /audit/summary, /audit/notifications

export default router;
