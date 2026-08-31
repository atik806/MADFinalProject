import { Router } from 'express';
import * as controller from './audit.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

// All audit-trail reads are admin-only.
router.use(authenticateUser, adminOnly);

router.get('/', controller.list);

export default router;
