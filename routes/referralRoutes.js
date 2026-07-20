import express from 'express';
import { getReferralPage } from '../controllers/referralController.js';
import { isUserAuthenticated } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.get('/referral', isUserAuthenticated, getReferralPage);

export default router;