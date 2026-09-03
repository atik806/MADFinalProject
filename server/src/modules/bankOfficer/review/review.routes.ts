import { Router } from 'express';
import * as reviewController from './review.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { bankOfficerOnly } from '../../../middleware/bankOfficer.middleware';

const router = Router();

// Guards are applied to the whole router before any handler is registered, so
// no loan-review endpoint can ever be reached without a valid Supabase token
// and a server-resolved, active `bank_officer` profile.
router.use(authenticateUser, bankOfficerOnly);

router.get('/', reviewController.list);
router.get('/:id', reviewController.getById);
router.post('/:id/review', reviewController.review);
router.post('/:id/decision', reviewController.decide);

export default router;
