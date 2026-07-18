import * as OrderRepo from '../repositories/orderRepository.js';
import * as ProductRepo from '../repositories/productRepository.js';
import * as ReturnRepo from '../repositories/returnRepository.js';
import * as UserRepo from '../repositories/userRepository.js';
import * as WalletRepo from '../repositories/walletRepository.js';
import mongoose from 'mongoose';
import { generateOrderID } from '../utils/idGenerator.js';


export const calculatePricing = (items) => {
    const itemsWithSubtotals = items.map(item => ({
        ...item,
        itemSubtotal: item.price * item.quantity
    }));
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.floor(subtotal * 0.10);
    
    return {
       items: itemsWithSubtotals, 
        summary: {                
            subtotal,
            tax,
            total: subtotal + tax,
            shipping: "Free"
        }
    };
};


export const getCheckoutPageData = async (userId) => {
    const [cart, user] = await Promise.all([
        OrderRepo.getCartByUserId(userId),
        UserRepo.findById(userId) 
    ]);

    if (!cart?.items?.length) throw new Error("Cart is empty");
    return { cart, addresses: user?.addresses || [] };
};

export const processCheckout = async (userId, orderData, isDirect = false) => {
    
    const sanitize = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num; 
    };
    
    const subtotal = sanitize(orderData.subtotal);
    const tax = sanitize(orderData.tax);
    const discount = sanitize(orderData.discount); 
    const calculatedTotal = (subtotal - discount) + tax; 

    for (const item of orderData.items) {
        const product = await ProductRepo.findProductById(item.productId);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        const sizeObj = variant?.sizes.find(s => s.size === Number(item.size));

        if (item.quantity > 5) throw new Error(`You cannot purchase more than 5 units.`);
        if (!sizeObj || sizeObj.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.productName}.`);
        }
    }

    const edd = new Date();
    edd.setDate(edd.getDate() + 5);
    
    const orderToSave = { 
        user_id: userId,
        items: orderData.items,
        deliveryAddress: orderData.deliveryAddress,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status || 'pending', 
        subtotal, tax, discount, 
        total: calculatedTotal,
        finalAmount: calculatedTotal,
        orderId: generateOrderID(),
        expectedDeliveryDate: edd
    };

    const newOrder = await OrderRepo.saveOrder(orderToSave);
    
    if (!newOrder) {
        console.error("DEBUG: OrderRepo.saveOrder returned null!");
        throw new Error("Failed to save order in database.");
    }

    for (const item of orderData.items) {
        await ProductRepo.decreaseStock(item.productId, item.variantId, item.size, item.quantity);
    }
    
    if (!isDirect) {
        await OrderRepo.clearCartByUserId(userId);
    }   
    return newOrder; 
};


export const getUserOrderHistory = async (userId, page, sortQuery, search) => {
    const limit = 3;
    const skip = (page - 1) * limit;
    const sortOrder = sortQuery === 'oldest' ? 1 : -1;

    const [totalItems, orders] = await Promise.all([
        OrderRepo.countOrdersByUserId(userId, search),
        OrderRepo.findOrdersByUserId(userId, limit, skip, sortOrder, search)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        orders: orders.map(order => ({
            ...order,
            formattedDate: new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            })
        })),
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        }
    };
};

export const getUserProfile = async (user_id) => {
    return await OrderRepo.findByUserId(user_id);
};

export const getOrderDetails = async (orderId) => {
    if (!orderId || orderId === 'undefined') {
        throw new Error('Invalid Order ID provided');
    }

    const order = await OrderRepo.findOrderById(orderId);
    
    if (!order) throw new Error('Order not found');
    return order;
};


export const cancelUserOrder = async (orderId, userId) => {
    const order = await OrderRepo.findUserOrderById(orderId, userId);
    
    if (!order) throw new Error("Order not found or access denied");
    if (order.status === 'cancelled') throw new Error("Order is already cancelled");

    for (const item of order.items) {
        await ProductRepo.increaseStock(
            item.productId._id, 
            item.variantId, 
            item.size, 
            item.quantity
        );
    }


const method = order.paymentMethod ? order.paymentMethod.trim().toLowerCase() : '';
    const paidMethods = ['razorpay', 'wallet'];


    if (paidMethods.includes(method) && order.status !== 'pending') {
        const refundAmount = Number(order.finalAmount) || 0;

        if (refundAmount > 0) {
            console.log(`DEBUG: Refunding ₹${refundAmount} to user ${userId}`);
            
            await WalletRepo.updateWallet(
                userId, 
                refundAmount, 
                'credit', 
                `Refund for cancelled Order #${order.orderId || order._id}`,
                order._id
            );
        } else {
            console.warn(`DEBUG: Refund triggered but amount is ${refundAmount}. Skipping wallet update.`);
        }
    } else {
        console.log(`DEBUG: No refund needed. Method: ${method}, Status: ${order.status}`);
    }

    await OrderRepo.updateOrder(orderId, { 
        status: 'cancelled',
        previousStatus: order.status, 
        cancelledAt: new Date() 
    });
};

export const getDirectProductDetails = async (productId, variantId, size, quantity) => {
    const objId = new mongoose.Types.ObjectId(productId);
    
    const product = await ProductRepo.findProductById(objId);
    if (!product) throw new Error(`Product not found for ID: ${productId}`);

    const variant = product.variants.find(v => v._id.toString() === variantId.toString());
    if (!variant) throw new Error("Variant not found");

    const price = product.salePrice || product.regularPrice;
    const qty = Number(quantity);

    return {
        productId: product,
        variantId,
        size,
        quantity: qty,
        price: price,
        itemSubtotal: price * qty 
    };
};

export const calculateDirectPricing = (item) => {
    const subtotal = item.price * item.quantity;
    const tax = Math.floor(subtotal * 0.10);
    return {
        subtotal,
        tax,
        total: subtotal + tax,
        shipping: "Free"
    };
};


export const getUserOrderDetails = async (orderId, userId) => {
    const order = await OrderRepo.findUserOrderById(orderId, userId);
    if (!order) throw new Error('Order not found or access denied');

    const returnRequest = await ReturnRepo.findByOrderId(order.orderId);
    let displayStatus = order.status; 
    if (returnRequest && returnRequest.status !== 'Rejected' && returnRequest.status !== 'CancelledByAdmin') {
        displayStatus = `Return ${returnRequest.status}`;
    } 

    return {
        ...order,
        displayStatus,
        returnRequest,
        formattedDate: new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
    };
};

export const getOrderForInvoice = async (orderId) => {
    const order = await OrderRepo.findOrdersByUserId(userId);
    if (!order) throw new Error("Order not found");
    
    return order;
};


export const cancelItemInOrder = async (orderId, itemId, userId) => { 
    const order = await OrderRepo.findOrderById(orderId);

  return order;
};


const calculateEDD = (days = 5) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

export const updatePaymentStatus = async (orderId, paymentId, status) => {
    return await OrderRepo.updateOrder(orderId, { 
        paymentId: paymentId,
        status: status 
    });
};

export const getSelectedAddress = async (userId, addressId) => {
    const user = await UserRepo.findById(userId);

    const address = user.addresses.find(
        a => a._id.toString() === addressId
    );

    if (!address) {
        throw new Error("Delivery address not found");
    }

    return address;
};