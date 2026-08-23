import { Router } from 'express';
import { deleteNotification, getNotification, markAsRead } from '../controllers/notification.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { farmerOnly } from '../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

router.get("/", getNotification);
router.put(":id/read",markAsRead);
router.delete(":id", deleteNotification);

export default router;
