import { Router } from 'express';
import * as controller from './loans.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;
