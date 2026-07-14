import * as OrderService from '../services/OrderService.js';
import * as ReturnService from '../services/returnService.js';
import * as UserRepo from '../repositories/userRepository.js';
import * as CouponRepo from '../repositories/couponRepository.js';
import * as CouponService from '../services/couponService.js';
import puppeteer from 'puppeteer';
import mongoose  from 'mongoose';

export const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search?.trim() || '';
        const sort = req.query.sort || 'latest';

        const orderData = await OrderService.getUserOrderHistory(userId, page, sort, search);
        const user = await OrderService.getUserProfile(userId);
      

        res.render('user/history', {
           orders: orderData.orders,
           user: user ? user.toObject() : null,
           currentPage: orderData.pagination.currentPage,
           totalPages: orderData.pagination.totalPages,
           hasNextPage: orderData.pagination.hasNextPage,
           hasPrevPage: orderData.pagination.hasPrevPage,
           nextPage: orderData.pagination.nextPage,
           prevPage: orderData.pagination.prevPage,
           activePage:'orders',
           searchQuery: req.query.search || '',  
           currentSort: sort       
    });
    } catch (error) {
       console.error("Error:",error);
    res.status(500).send(`<pre>${error.stack}</pre>`); 
    }
};

export const getOrderById = async (req, res) => {
       try {
            const order = await OrderService.getOrderDetails(req.params.id);
             return res.render('user/order-detail',
             order
            );
       }catch (error) {
        return res.status(error.message === 'Order not found' ? 404 : 500).json({ 
        success: false, 
        message: error.message 
    });
  }
};

export const cancelOrder = async (req, res) => {
    try {
        const order = await OrderService.getOrderDetails(req.params.id);
        const userId = req.session.user.id;
        const orderId = order._id; 

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is missing from request" });
        }

        await OrderService.cancelUserOrder(orderId, userId);

        return res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Cancellation Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const renderCheckoutPage = async (req, res) => {
    try {
        console.log("DEBUG: Session on Load:", req.session.appliedCouponCode);
        
        let checkoutData;
        const availableCoupons = await CouponService.fetchAvailableCoupons();

        if (req.session.directPurchase) {
            const { productId, variantId, size, quantity } = req.session.directPurchase;
            const directItem = await OrderService.getDirectProductDetails(productId, variantId, size, quantity);
            
            if (!directItem) return res.redirect('/cart');
            
            checkoutData = {
                cartItems: [directItem], 
                pricing: OrderService.calculateDirectPricing(directItem),
                isDirect: true
            };
        } else {
            const { cart, addresses } = await OrderService.getCheckoutPageData(req.user.id);
            
            if (!cart || !cart.items || cart.items.length === 0) {
                req.session.appliedCouponCode = null;
                return res.redirect('/cart');
            }

            const { items, summary } = OrderService.calculatePricing(cart.items);
            checkoutData = {
                cartItems: items, 
                pricing: summary,
                addresses: addresses,
                isDirect: false
            };
        }

        let discount = 0;
        if (req.session.appliedCouponCode) {
            try {
                const result = await CouponService.validate(req.session.appliedCouponCode, checkoutData.pricing.subtotal);
                discount = Number(result.amount) || 0;
            } catch (err) {
                console.warn("Coupon invalid for current cart, clearing session:", err.message);
                req.session.appliedCouponCode = null;
                discount = 0;
            }
        }

        const finalPricing = {
            ...checkoutData.pricing,
            discount: discount,
            total: Math.max(0, (checkoutData.pricing.subtotal - discount) + checkoutData.pricing.tax)
        };

        return res.render('user/checkout', {
            title: 'Checkout',
            cartItems: checkoutData.cartItems,
            pricing: finalPricing,
            addresses: checkoutData.addresses || req.user?.addresses || [],
            isDirect: checkoutData.isDirect,
            coupons: availableCoupons,
            appliedCoupon: req.session.appliedCouponCode
        });
    } catch (error) {
        console.error("DEBUG: Render Error:", error);
        return res.redirect('/cart');
    }
};

export const handleCheckoutData = (req, res) => {
    try {
        const { productId, variantId, size, quantity } = req.body;

        if (!productId) {
            req.session.directPurchase = null; 
            return res.status(200).json({ success: true });
        }

        if (!variantId || !size) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        req.session.directPurchase = { productId, variantId, size, quantity };
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Failed to process checkout" });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const userId = req.user._id;
        
        let items, summary;

        if (req.session.directPurchase) {
            const { productId, variantId, size, quantity } = req.session.directPurchase;
            const directItem = await OrderService.getDirectProductDetails(productId, variantId, size, quantity);
            items = [directItem];
            summary = OrderService.calculateDirectPricing(directItem);
        } else {
            const { cart } = await OrderService.getCheckoutPageData(userId);
            const pricing = OrderService.calculatePricing(cart.items);
            items = pricing.items;
            summary = pricing.summary;
        }

        const subtotal = Number(summary.subtotal) || 0;
        const tax = Number(summary.tax) || 0;
        let discount = 0;
        let couponId = null;

     if (req.session.appliedCouponCode) {
      try {
        const result = await CouponService.validate(req.session.appliedCouponCode, summary.subtotal);
        
        discount = (result && typeof result.amount === 'number') ? result.amount : 0;
        couponId = (result && result._id) ? result._id : null;
        
        console.log("DEBUG: Final validation check - Discount:", discount, "CouponID:", couponId);
    } catch (err) {
        console.error("DEBUG: Coupon validation failed:", err);
        discount = 0;
        couponId = null;
    }
} else {
    console.log("DEBUG: No coupon found in session.");
}
        
        const finalTotal = (summary.subtotal - discount) + summary.tax;
        const user = await UserRepo.findById(userId);
        const selectedAddress = user.addresses.find(a => a._id.toString() === addressId);
        if (!selectedAddress) throw new Error("Delivery address not found");

        const orderData = {
            user_id: userId,
            items: items.map(i => ({
                productId: i.productId._id,
                variantId: i.variantId,
                productName: i.productId.productName,
                productImage: i.productId.variants?.[0]?.images?.[0] || "",
                price: i.price,
                quantity: i.quantity,
                size: i.size
            })),
            deliveryAddress: {
                fullName: selectedAddress.fullName,
                addressLine1: selectedAddress.street,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                mobileNumber: selectedAddress.phone
            },
            subtotal: subtotal,
            discount: discount,
            tax: tax,
            total: finalTotal,
            finalAmount: finalTotal,
            paymentMethod: paymentMethod,
            status: (paymentMethod === 'COD') ? 'pending' : 'processing'
        };

        console.log("DEBUG: Final object sent to service:place order controller", orderData);
        
        const newOrder = await OrderService.processCheckout(userId, orderData, !!req.session.directPurchase);
        
     if (couponId) {
       try {
        await CouponRepo.decrementUseCount(couponId);
        console.log("DEBUG: Coupon use_count successfully decremented.");
    } catch (err) {
        console.error("DEBUG: Failed to decrement coupon use_count:", err);
    }
}
        
        req.session.directPurchase = null;
        req.session.appliedCouponCode = null; 

        req.flash('success', "Order placed successfully");
        res.status(200).json({ success: true, orderId: newOrder._id });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).json({ message: "Failed to place order: " + error.message });
    }
};

export const getOrderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await OrderService.getOrderDetails(orderId);
        
        res.render('user/order-confirmation', {
            title: 'Order Confirmation',
            order: order
        });
    } catch (error) {
        console.error("DEBUG: Confirmation Page Error:", error);
        res.status(404).send("Order confirmation not found.");
    }
};


export const getOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const order = await OrderService.getUserOrderDetails(req.params.id, userId);
        
        const status = order.status.toLowerCase();
        const statusOrder = ['pending', 'processing', 'shipped', 'out of delivery', 'delivered'];
        const currentStep = statusOrder.indexOf(status);
        
        
        const isCancelled = status === 'cancelled';
        
        const isReturnable = currentStep >= 2 && !isCancelled;
        
        const showCancelButton = !isCancelled && currentStep >= 0 && currentStep < 2;

        res.render('user/order-detail', {
            order,
            currentStep,
            isCancelled,
            isReturnable,     
            showCancelButton, 
            title: 'Order Details',
            activePage: 'orders'
        });
    } catch (error) {
        res.status(404).render('error', { message: error.message });
    }
};

export const cancelOrderItem = async (req, res) => {
    const orderId = req.params.orderId; 
    
    try {
        const { itemId } = req.params;
        const userId = req.session.user.id;

        await OrderService.cancelItemInOrder(orderId, itemId, userId);
        res.redirect(`/orders/${orderId}?canceled=true`);
    } catch (error) {
        res.redirect(`/orders/${orderId}?error=true&msg=${encodeURIComponent(error.message)}`);
    }
};

export const getReturnForm = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        
        const order = await OrderService.getUserOrderDetails(orderId, req.session.user.id); 
        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render('user/return-form', { order });
        
    } catch (error) {
        console.error("DEBUG ERROR in getReturnForm:", error);
        req.flash('error', "Return request as already done.");
        res.redirect('/history');
    }
};


export const downloadInvoice = async (req, res) => {
    try {
        const order = await OrderService.getUserOrderDetails(req.params.id, req.session.user.id);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const html = await new Promise((resolve, reject) => {
            res.render('user/invoice-template', { order, layout: false }, (err, html) => {
                if (err) reject(err);
                resolve(html);
            });
        });

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px' }
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
        res.send(pdf);
    } catch (error) {
        console.error("Invoice Error:", error);
        res.status(500).send("Could not generate invoice.");
    }
};

