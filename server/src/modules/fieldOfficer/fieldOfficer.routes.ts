import { Router } from 'express';
import profileRoutes from './profile/profile.routes';
import farmersRoutes from './farmers/farmers.routes';
import verificationRoutes from './verification/verification.routes';
import visitsRoutes from './visits/visits.routes';

const router = Router();

// Field Officer API surface. Every route is guarded by
// authenticateUser + fieldOfficerOnly within its own router. Field Officer
// accounts are admin-created (there is no self-registration).
router.use('/profile', profileRoutes);
router.use('/farmers', farmersRoutes);
router.use('/verification', verificationRoutes);
router.use('/visits', visitsRoutes);

export default router;
