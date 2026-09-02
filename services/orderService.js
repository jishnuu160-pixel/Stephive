import * as OrderRepo from '../repositories/orderRepository.js';
import * as ProductRepo from '../repositories/productRepository.js';
import * as ReturnRepo from '../repositories/returnRepository.js';
import * as UserRepo from '../repositories/userRepository.js';
import * as WalletRepo from '../repositories/walletRepository.js';
import * as CouponRepo from '../repositories/couponRepository.js';
import mongoose from 'mongoose';
import { generateOrderID } from '../utils/idGenerator.js';
import { attachOfferPricing } from './productService.js';


export const calculatePricing = async (items) => {
    const itemsWithSubtotals = await Promise.all(
        items.map(async (item) => {
            const product = typeof item.productId === 'object' && item.productId !== null
                    ? item.productId
                    : await ProductRepo.findProductById(item.productId);

            if (!product) {
                return {
                    ...item,
                    price: 0,
                    itemSubtotal: 0
                };
            }

            const pricedProduct = await attachOfferPricing(product);
            const effectivePrice = Number(pricedProduct.salePrice) || 0;
            const qty = Number(item.quantity) || 1;

            return {
                ...item,
                regularPrice: pricedProduct.regularPrice,
                price: effectivePrice,
                discountAmount: pricedProduct.discountAmount,
                effectiveDiscount: pricedProduct.effectiveDiscount,
                hasOffer: pricedProduct.hasOffer,
                itemSubtotal: effectivePrice * qty
            };
        })
    );

    const subtotal = itemsWithSubtotals.reduce(
        (sum, item) => sum + item.itemSubtotal,
        0
    );

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

    const evaluatedPricing = await calculatePricing(cart.items);

    const updatedCart = {
        ...(cart.toObject ? cart.toObject() : cart),
        items: evaluatedPricing.items,
        subtotal: evaluatedPricing.summary.subtotal,
        tax: evaluatedPricing.summary.tax,
        total: evaluatedPricing.summary.total
    };

    return { cart: updatedCart, addresses: user?.addresses || [] };
};

export const processCheckout = async (userId, orderData, isDirect = false,couponCode=null) => {
    
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
        status: orderData.status || 'placed', 
        subtotal, tax, discount, 
        total: calculatedTotal,
        finalAmount: calculatedTotal,
        couponCode: couponCode,
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
    if (order.status.toLowerCase() === 'cancelled') throw new Error("Order is already cancelled");

    const updatedOrder = await OrderRepo.updateOrder(orderId, { 
        status: 'cancelled',
        previousStatus: order.status, 
        cancelledAt: new Date() 
    });

    if (!updatedOrder) {
        console.warn(`DEBUG: Cancellation already processed elsewhere for order ${orderId}. Skipping stock & refund.`);
        return;
    }

    for (const item of order.items) {
        if ((item.status || '').toLowerCase() === 'cancelled') continue;

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
};

export const getDirectProductDetails = async (
    productId,
    variantId,
    size,
    quantity,
    colorInput
) => {
    const objId = new mongoose.Types.ObjectId(productId);

    const product = await ProductRepo.findProductById(objId);

    if (!product) {
        throw new Error(`Product not found for ID: ${productId}`);
    }

    const variant = product.variants.find(
        v => v._id.toString() === variantId.toString()
    );

    if (!variant) {
        throw new Error("Variant not found");
    }

    const sizeObj = variant.sizes.find(
        s => Number(s.size) === Number(size)
    );

    if (!sizeObj) {
        throw new Error("Size not found");
    }

    const color =
        colorInput ||
        variant.colorName ||
        variant.color ||
        '';

    const pricedProduct = await attachOfferPricing(product);

    const price = Number(pricedProduct.salePrice) || 0;

    const qty = Number(quantity) || 1;

    return {
        productId: product,
        variantId,
        size,
        color,
        quantity: qty,

        regularPrice: pricedProduct.regularPrice,

        price,

        discountAmount: pricedProduct.discountAmount,

        effectiveDiscount: pricedProduct.effectiveDiscount,

        hasOffer: pricedProduct.hasOffer,

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

    const returnsList = await ReturnRepo.findAllReturnsForOrder(order.orderId);
    const returnRequest = returnsList.length > 0 ? returnsList[0] : null;

    const activeItemsForCalc = order.items.filter(i => (i.status || '').toLowerCase() !== 'cancelled');
    const calculatedOriginalSubtotal = activeItemsForCalc.reduce((sum, i) => sum + ((i.price || 0) * (Number(i.quantity) || 1)), 0);
    const orderSubtotal = calculatedOriginalSubtotal > 0 ? calculatedOriginalSubtotal : (Number(order.subtotal) || 1); 
    const orderDiscount = Number(order.discount) || 0;
    const orderShippingCharge = Number(order.shippingCharge) || 0;

    const updatedItems = order.items.map(item => {
        let itemReturnStatus = (item.status && item.status.length < 24) ? item.status : (order.status || 'Placed');        
        let isReturned = false;
        
       const matchedReturn = returnsList.find(ret => {
            const returnItemIdStr = ret.itemId ? ret.itemId.toString() : '';
            const currentItemIdStr = item._id ? item._id.toString() : '';

            if (returnItemIdStr && currentItemIdStr) {
                return returnItemIdStr === currentItemIdStr;
            }

            const returnProdStr = ret.productId ? ret.productId.toString() : '';
            const itemProdStr = item.productId ? (item.productId._id ? item.productId._id.toString() : item.productId.toString()) : '';

            const isProductMatch = (returnProdStr === itemProdStr);
            const isVariantMatch = !ret.variantId || !item.variantId || (ret.variantId.toString() === item.variantId.toString());
            const isSizeMatch = (ret.size === undefined || ret.size === null) || (Number(ret.size) === Number(item.size));

            return isProductMatch && isVariantMatch && isSizeMatch;
        });

        if (matchedReturn) {
            if (matchedReturn.status !== 'Rejected' && matchedReturn.status !== 'CancelledByAdmin') {
                itemReturnStatus = `Return ${matchedReturn.status}`;
                isReturned = true; 
            }
        }

        const statusLower = (item.status || '').toLowerCase();
        if (statusLower === 'returned' || statusLower === 'refunded') {
            isReturned = true;
        }

        const rawItemSubtotal = (item.price || 0) * (Number(item.quantity) || 1);
        
        const itemTaxShare = rawItemSubtotal * 0.10;
        const priceWithTaxBeforeDiscount = rawItemSubtotal + itemTaxShare;

        let itemDiscountShare = 0;
        if (orderSubtotal > 0 && orderDiscount > 0) {
            const proportion = rawItemSubtotal / orderSubtotal;
            itemDiscountShare = Number((orderDiscount * proportion).toFixed(2));
        }

        const finalPriceWithTax = Number((priceWithTaxBeforeDiscount - itemDiscountShare).toFixed(2));
        const unitPriceWithTax = Number((finalPriceWithTax / (Number(item.quantity) || 1)).toFixed(2));

        return {
            ...item,
            basePrice: Number(rawItemSubtotal.toFixed(2)),  
            itemSubtotal: Number(priceWithTaxBeforeDiscount.toFixed(2)),
            itemDiscount: itemDiscountShare, 
            itemReturnStatus,
            isReturned,
            itemReturnRequest: matchedReturn || null,
            priceWithTax: finalPriceWithTax, 
            unitPriceWithTax
        };
    });

    const activeItems = updatedItems.filter(item => {
        const statusLower = (item.status || '').toLowerCase();
        return statusLower !== 'cancelled' && !item.isReturned;
    });

    const isOrderFullyInactive = activeItems.length === 0;

    const finalSubtotal = isOrderFullyInactive 
        ? Number(order.subtotal || orderSubtotal) 
        : Number(activeItems.reduce((sum, i) => sum + ((i.price || 0) * (Number(i.quantity) || 1)), 0).toFixed(2));

    const finalTax = isOrderFullyInactive 
        ? Number(order.tax || (finalSubtotal * 0.10).toFixed(2)) 
        : Number((finalSubtotal * 0.10).toFixed(2));

    const finalDiscount = isOrderFullyInactive 
        ? orderDiscount 
        : Number(activeItems.reduce((sum, i) => {
            const itemSub = (i.price || 0) * (Number(i.quantity) || 1);
            if (orderSubtotal > 0 && orderDiscount > 0) {
                return sum + (orderDiscount * (itemSub / orderSubtotal));
            }
            return sum;
        }, 0).toFixed(2));

    const finalAmount = isOrderFullyInactive 
        ? Number(order.finalAmount || order.total || ((finalSubtotal - finalDiscount) + finalTax + orderShippingCharge).toFixed(2))
        : Math.max(0, Number(((finalSubtotal - finalDiscount) + finalTax + orderShippingCharge).toFixed(2)));

    const totalItemsCount = order.items.length;
    const returnedCount = updatedItems.filter(i => i.isReturned || ['returned', 'refunded'].includes((i.status || '').toLowerCase())).length;
    const cancelledCount = updatedItems.filter(i => (i.status || '').toLowerCase() === 'cancelled').length;

    let displayStatus = order.status;
    if (returnRequest && returnRequest.status !== 'Rejected' && returnRequest.status !== 'CancelledByAdmin') {
        displayStatus = `Return ${returnRequest.status}`;
    } else if (returnedCount === totalItemsCount && totalItemsCount > 0) {
        displayStatus = 'Returned';
    } else if (returnedCount > 0) {
        displayStatus = 'Partially Returned';
    } else if (cancelledCount === totalItemsCount && totalItemsCount > 0) {
        displayStatus = 'Cancelled';
    } else if (cancelledCount > 0) {
        displayStatus = 'Partially Cancelled';
    }

    return {
        ...order,
        subtotal: finalSubtotal,
        tax: finalTax,
        discount: finalDiscount,
        finalAmount: finalAmount,
        total: finalAmount,
        items: updatedItems,
        displayStatus,
        returnRequest,
        formattedDate: new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
    };
};


export const getOrderForInvoice = async (orderId,userId) => {
    const order = await OrderRepo.findOrdersByUserId(orderId,userId);
    if (!order) throw new Error("Order not found");
    
    return order;
};


export const cancelItemInOrder = async (orderId, itemId, userId) => {
    const order = await OrderRepo.findUserOrderById(orderId, userId);
    if (!order) throw new Error("Order not found or access denied");

    if (['cancelled', 'delivered', 'shipped', 'out of delivery'].includes(order.status.toLowerCase())) {
        throw new Error("Item cannot be cancelled at this stage.");
    }

    const item = order.items.find(i => i._id.toString() === itemId.toString());
    if (!item) throw new Error("Item not found in order");

    if (item.status === 'cancelled') {
        throw new Error("Item is already cancelled");
    }

    await ProductRepo.increaseStock(
        item.productId._id || item.productId, 
        item.variantId, 
        item.size, 
        item.quantity
    );

    const activeItems = order.items.filter(i => i._id.toString() !== itemId.toString() && i.status !== 'cancelled');
    const isLastItem = activeItems.length === 0;

    const itemSubtotal = (item.price || 0) * (Number(item.quantity) || 1);
    const taxShare = itemSubtotal * 0.10; 
    const taxIncludedBeforeDiscount = itemSubtotal + taxShare; 

    const orderSubtotal = Number(order.subtotal) || 1;
    const orderDiscount = Number(order.discount) || 0;
    
    let itemDiscountShare = 0;
    if (orderSubtotal > 0 && orderDiscount > 0) {
        const proportion = itemSubtotal / orderSubtotal;
        itemDiscountShare = Number((orderDiscount * proportion).toFixed(2)); 
    }

    const itemTotalRefund = Number((taxIncludedBeforeDiscount - itemDiscountShare).toFixed(2));

    const method = order.paymentMethod ? order.paymentMethod.trim().toLowerCase() : '';
    const paidMethods = ['razorpay', 'wallet'];

    if (paidMethods.includes(method) && order.status !== 'pending') {
        const refundAmount = isLastItem ? (Number(order.finalAmount) || 0) : itemTotalRefund;

        if (refundAmount > 0) {
            const itemName = item.productId?.productName || item.productName || 'Item';
            const itemSize = item.size ? ` (Size: ${item.size})` : '';
            const orderIdentifier = order.orderId || order._id;

           const description = isLastItem 
            ? `Refund for order (Order #${orderIdentifier})` 
            : `Refund for order (Order #${orderIdentifier}) ${itemName}${itemSize}`;
            await WalletRepo.updateWallet(
                userId, 
                refundAmount, 
                'credit', 
                description, 
                order._id
            );
        }
    }

    if (isLastItem) {
        await mongoose.model('Order').updateOne(
            { _id: orderId, 'items._id': itemId },
            {
                $set: {
                    status: 'cancelled',
                    previousStatus: order.status,
                    cancelledAt: new Date(),
                    'items.$.status': 'cancelled'
                }
            }
        );
    } else {
        const newSubtotal = Math.max(0, order.subtotal - itemSubtotal);
        const newTax = Math.max(0, order.tax - taxShare);
        const newDiscount = Math.max(0, orderDiscount - itemDiscountShare);
        const newFinalAmount = Math.max(0, (newSubtotal - newDiscount) + newTax);

        await mongoose.model('Order').updateOne(
            { _id: orderId, 'items._id': itemId },
            { 
                $set: { 
                    'items.$.status': 'cancelled',
                    subtotal: Number(newSubtotal.toFixed(2)),
                    tax: Number(newTax.toFixed(2)),
                    discount: Number(newDiscount.toFixed(2)),
                    finalAmount: Number(newFinalAmount.toFixed(2)),
                    total: Number(newFinalAmount.toFixed(2))
                } 
            }
        );
    }

    return { success: true, message: isLastItem ? "Order cancelled as last item was removed." : "Item cancelled successfully." };
};


const calculateEDD = (days = 5) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

export const updatePaymentStatus = async (orderId, paymentId, status, sessionCouponCode = null) => {
    const updateOrder = await OrderRepo.updatePaymentStatus(orderId, paymentId, status);

    const activeCouponCode = updateOrder?.couponCode || sessionCouponCode;

    console.log("DEBUG: Updated Order Object ->", updateOrder);
    console.log("DEBUG: Coupon Code Found ->", activeCouponCode);

    if (updateOrder && status.toLowerCase() === 'placed' && activeCouponCode) {
        const coupon = await CouponRepo.findByCode(activeCouponCode);
        console.log("DEBUG: Matched Coupon ->", coupon);
        if (coupon) {
            await CouponRepo.decrementUseCount(coupon._id);
            console.log("DEBUG: Coupon count successfully decremented.");
        }
    }
    return updateOrder;
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


export const fetchOrderByCustomId = async (orderId) => {
    return await OrderRepo.findByCustomOrderId(orderId);
};

export const getOrderForRetry = async (orderId, userId) => {
    return await OrderRepo.findOrderById(orderId); 
};

export const failOrderAndRestoreStock = async (orderId) => {
    return await OrderRepo.markOrderAsFailed(orderId);
};