import { Router } from 'express';
import * as farmersController from './farmers.controller';
import { authenticateUser } from '../../../middleware/auth.middleware';
import { fieldOfficerOnly } from '../../../middleware/fieldOfficer.middleware';

const router = Router();

router.use(authenticateUser, fieldOfficerOnly);

router.get('/', farmersController.list);
router.get('/:id', farmersController.getById);
router.post('/', farmersController.register);
router.put('/:id', farmersController.update);

export default router;
