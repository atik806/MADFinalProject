import { Router } from 'express';
import * as dashboardController from './dashboard.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/stats', dashboardController.getStats);
router.get('/registration-trend', dashboardController.getRegistrationTrend);
router.get('/loan-analytics', dashboardController.getLoanAnalytics);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/overview', dashboardController.getOverview);

export default router;
