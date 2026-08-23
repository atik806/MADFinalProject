import { Router } from 'express';
import * as notificationController from './notifications.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { farmerOnly } from '../../../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

router.get('/', notificationController.getNotification);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
