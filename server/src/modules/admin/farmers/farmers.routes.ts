import { Router } from 'express';
import * as farmersController from './farmers.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { adminOnly } from '../../../middleware/admin.middleware';

const router = Router();

// Read-only admin view of farmers. Verification writes stay with the field
// officer module; account status writes stay with the users module.
router.use(authenticateUser, adminOnly);

router.get('/', farmersController.list);
router.get('/:id', farmersController.getById);

export default router;
