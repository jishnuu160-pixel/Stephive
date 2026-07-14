import express from 'express';
import { getCouponPage, getAddCouponPage, addCoupon, getEditCouponPage, updateCoupon,toggleCouponStatus } from '../controllers/couponController.js';
import { isAdminAuthenticated } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, getCouponPage);
router.get('/add', isAdminAuthenticated, getAddCouponPage);
router.post('/add', isAdminAuthenticated, addCoupon);  

router.get('/edit/:id',isAdminAuthenticated,getEditCouponPage);
router.post('/edit/:id',isAdminAuthenticated,updateCoupon);
router.post('/toggle-status/:id', isAdminAuthenticated,toggleCouponStatus);

export default router;