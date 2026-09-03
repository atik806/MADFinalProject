import { Router } from 'express';
import * as loansController from './loans.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { fieldOfficerOnly } from '../../../middleware/fieldOfficer.middleware';

const router = Router();

router.use(authenticateUser, fieldOfficerOnly);

router.get('/', loansController.list);
router.post('/', loansController.create);
router.get('/:id', loansController.getById);
router.put('/:id', loansController.update);
router.post('/:id/submit', loansController.submit);
router.post('/:id/verify', loansController.verify);
router.post('/:id/forward', loansController.forward);

export default router;
