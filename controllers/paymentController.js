import crypto from 'crypto';
import * as OrderService from '../services/OrderService.js'; 


export const verifyPayment = async (req, res) => {
    try {        
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature
            } = req.body;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment response fields" });
        }
        
       const orderData = req.session.pendingOrder;

       req.session.failedPayment = {
       amount: finalTotal,
        paymentMethod,
       razorpayOrderId: rzpOrder.id
       };


        if (!orderData) {
         return res.status(400).json({
           success: false,
           message: "Pending order not found"
         });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error("DEBUG: Razorpay signature mismatch.");
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }


        const userId = req.session.user.id;
        const newOrder = await OrderService.processCheckout(
            userId,
            orderData, 
            !!req.session.directPurchase
        );
        
        if (!newOrder || !newOrder._id) {
            return res.status(500).json({ success: false, message: "Order creation failed in service" });
        }
        
        console.log("DEBUG: Order created successfully. ID:", newOrder._id);

        await OrderService.updatePaymentStatus(
            newOrder._id, 
            razorpay_payment_id, 
            'placed'
        );

        delete req.session.pendingOrder;
        req.session.directPurchase = null;
        req.session.appliedCouponCode = null;

        return res.status(200).json({ 
            success: true, 
            orderId: newOrder._id, 
            message: "Payment verified and order created" 
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Internal server error during verification" 
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