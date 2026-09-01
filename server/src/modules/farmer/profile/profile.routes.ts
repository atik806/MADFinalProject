import { Router } from 'express';
import * as profileController from './profile.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { farmerOnly } from '../../../middleware/role.middleware';

const router = Router();

router.use(authenticateUser);
router.use(farmerOnly);

// Both /profile and /me serve the farmer's own profile; /me matches the
// milestone API contract (GET/PUT /api/farmer/me).
router.get('/', profileController.getFarmerProfile);
router.put('/', profileController.updateProfile);

export default router;
