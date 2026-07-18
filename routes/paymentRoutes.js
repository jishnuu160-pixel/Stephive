import { verifyPayment,paymentFailed,createOrder } from '../controllers/paymentController.js';
import express from 'express';
const router = express.Router();

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/payment-failed', paymentFailed);
export default router;