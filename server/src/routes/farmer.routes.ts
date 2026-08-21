import { Router } from 'express';
import { getFarmerDashboard, getFarmerProfile, updateProfile } from '../controllers/farmer.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { farmerOnly } from '../middleware/role.middleware';


const router = Router();
router.use(authenticateUser);
router.use(farmerOnly);



router.get("/profile", getFarmerProfile);
router.put("/profile", updateProfile);
router.get("/dashboard", getFarmerDashboard);


export default router;