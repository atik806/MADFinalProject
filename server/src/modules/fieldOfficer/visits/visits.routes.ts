import { Router } from 'express';
import * as visitsController from './visits.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { fieldOfficerOnly } from '../../../middleware/fieldOfficer.middleware';

const router = Router();

router.use(authenticateUser, fieldOfficerOnly);

router.get('/', visitsController.list);
router.post('/', visitsController.create);
router.get('/:id', visitsController.getById);
router.put('/:id', visitsController.update);
router.post('/:id/complete', visitsController.complete);
router.post('/:id/cancel', visitsController.cancel);

export default router;
