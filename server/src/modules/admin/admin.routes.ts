import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import dashboardRoutes from './dashboard/dashboard.routes';
import fieldOfficerRoutes from './fieldOfficers/fieldOfficers.routes';
import bankOfficerRoutes from './bankOfficers/bankOfficers.routes';
import auditRoutes from './audit/audit.routes';

const router = Router();

// Admin API surface. Auth login/seed are public inside auth.routes; every
// other admin route is guarded by authenticateUser + adminOnly within its
// own router.
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/field-officers', fieldOfficerRoutes);
router.use('/bank-officers', bankOfficerRoutes);
router.use('/audit', auditRoutes);

export default router;
