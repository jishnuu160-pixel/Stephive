import crypto from 'crypto';

import * as OrderService from '../services/orderService.js';
import * as WalletService from '../services/walletService.js'; 
import { HTTP_STATUS } from '../constants/httpStatusCode.js';


import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export const createOrder = async (req, res) => {
    try {
        const { amount, isWalletRecharge, orderData } = req.body;

        if (!amount || amount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid amount" });
        }

        if (isWalletRecharge) {
            req.session.pendingOrder = null;
            
            req.session.isWalletRecharge = true;
            req.session.rechargeAmount = parseFloat(amount);
        } else {
            req.session.pendingOrder = orderData;
            req.session.isWalletRecharge = false; 
        }

        const options = {
            amount: Math.round(amount * 100), 
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        res.status(HTTP_STATUS.OK).json({
            success: true,
            id: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to create Razorpay order" });
    }
};


export const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            dbOrderId 
        } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Missing payment response fields" });
        }
        
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid signature" });
        }

        const userId = req.session.user.id;

        if (req.session.isWalletRecharge) {
            const amount = req.session.rechargeAmount;

            await WalletService.addFunds(userId, parseFloat(amount), `Added amount ${amount} to wallet`);

            delete req.session.isWalletRecharge;
            delete req.session.rechargeAmount;

            return res.status(HTTP_STATUS.OK).json({ success: true, message: "Wallet updated successfully" });
        }

        const targetOrderId = dbOrderId || req.session.failedPayment?.dbOrderId;
        const appliedCouponCode = req.session.appliedCouponCode;

        if (!targetOrderId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Order reference not found or session expired"
            });
        }

        await OrderService.updatePaymentStatus(targetOrderId, razorpay_payment_id, 'placed', appliedCouponCode);

        delete req.session.pendingOrder;
        delete req.session.failedPayment;
        req.session.directPurchase = null;
        req.session.appliedCouponCode = null;

        return res.status(HTTP_STATUS.OK).json({ 
            success: true, 
            orderId: targetOrderId, 
            message: "Payment verified and order placed successfully" 
        });

    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || "Internal server error" 
        });
    }
};



export const paymentFailed = (req, res) => {
    const payment = req.session.failedPayment;

    res.render('user/payment-failed', {
        orderId: payment?.orderId || "N/A",
        amount: payment?.amount || 0,
        paymentMethod: payment?.paymentMethod || "Razorpay"
    });
};


export const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.session.user?.id;

        if (!orderId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order ID is required" });
        }

        const order = await OrderService.getOrderForRetry(orderId, userId);

        if (!order) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                success: false, 
                message: "Order not found." 
            });
        }

        const options = {
            amount: Math.round(order.finalAmount * 100), 
            currency: "INR",
            receipt: `rcpt_${orderId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            razorpayOrderId: razorpayOrder.id,
            dbOrderId: order._id
        });

    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: "Failed to initialize payment retry" 
        });
    }
};