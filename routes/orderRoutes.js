import express from "express";

import { placeOrder, getUserOrders,
      getOrderConfirmation,
      cancelOrder,handleCheckoutData,
      renderCheckoutPage,getOrderDetails,
      getReturnForm,downloadInvoice,
      renderPaymentFailurePage,cancelOrderItem,
handlePaymentExit} from '../controllers/orderController.js';
import { isUserAuthenticated } from '../middleware/authMiddleware.js';
import {handleReturnRequest} from '../controllers/returnController.js';

const router = express.Router();

router.post('/checkout', isUserAuthenticated, handleCheckoutData);
router.get('/checkout', isUserAuthenticated, renderCheckoutPage);
router.post('/place-order', isUserAuthenticated, placeOrder);
router.get('/history', isUserAuthenticated, getUserOrders);

router.get('/order-confirmation/:id', isUserAuthenticated, getOrderConfirmation);

router.post('/orders/:id/cancel', isUserAuthenticated, cancelOrder);
router.post('/orders/:orderId/cancel-item/:itemId', isUserAuthenticated, cancelOrderItem);
router.get('/orders/:id', isUserAuthenticated, getOrderDetails );

router.get('/orders/payment-failed', renderPaymentFailurePage);

router.get('/orders/return/:id', isUserAuthenticated, getReturnForm);
router.post('/orders/return/:id', isUserAuthenticated, handleReturnRequest);

router.get('/orders/invoice/:id', isUserAuthenticated, downloadInvoice);
router.post('/payment/payment-exit', handlePaymentExit);
export default router;