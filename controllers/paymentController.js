import crypto from 'crypto';
import mongoose from 'mongoose';

import * as OrderService from '../services/OrderService.js';
import * as WalletService from '../services/walletService.js'; 

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
            return res.status(400).json({ success: false, message: "Invalid amount" });
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

        res.status(200).json({
            success: true,
            id: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature, 
        } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment response fields" });
        }
        
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const userId = req.session.user.id;

        if (req.session.isWalletRecharge) {
            const amount = req.session.rechargeAmount;

            await WalletService.addFunds(userId, parseFloat(amount), 'Add Money');

            delete req.session.isWalletRecharge;
            delete req.session.rechargeAmount;

            return res.status(200).json({ success: true, message: "Wallet updated successfully" });
        }

        const orderData = req.session.pendingOrder;
        if (!orderData) {
            return res.status(400).json({
                success: false,
                message: "Pending order not found or session expired"
            });
        }

        const newOrder = await OrderService.processCheckout(
            userId,
            orderData, 
            !!req.session.directPurchase
        );
        
        if (!newOrder || !newOrder._id) {
            return res.status(500).json({ success: false, message: "Order creation failed" });
        }

        await OrderService.updatePaymentStatus(newOrder._id, razorpay_payment_id, 'placed');

        delete req.session.pendingOrder;
        req.session.directPurchase = null;
        req.session.appliedCouponCode = null;

        return res.status(200).json({ 
            success: true, 
            orderId: newOrder._id, 
            message: "Payment verified and order created" 
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return res.status(500).json({ 
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