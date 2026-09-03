import { Router } from 'express';
import profileRoutes from './profile/profile.routes';
import reviewRoutes from './review/review.routes';

const router = Router();

// Bank Officer API surface. Every route is guarded by
// authenticateUser + bankOfficerOnly within its own router. Bank officer
// accounts are admin-created (POST /api/admin/bank-officers); there is no
// self-registration.
router.use('/profile', profileRoutes);
router.use('/loans', reviewRoutes);

export default router;
