import { Router } from 'express';
import * as controller from './users.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

router.use(authenticateUser, adminOnly);

router.get('/counts', controller.counts);
router.get('/', controller.list);
router.get('/:id', controller.getById);

export default router;
