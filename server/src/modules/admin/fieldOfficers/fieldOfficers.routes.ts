import { Router } from 'express';
import * as controller from './fieldOfficers.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.setStatus);
router.post('/:id/reset-password', controller.resetPassword);

export default router;
