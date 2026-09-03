import { Router } from 'express';
import * as controller from './audit.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/logs', controller.getAuditLogs);
router.get('/summary', controller.getModuleSummary);

router.get('/notifications', controller.listAdminNotifications);
router.post('/notifications/:id/read', controller.markNotificationRead);
router.post('/notifications/read-all', controller.markAllNotificationsRead);

export default router;
