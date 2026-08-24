import * as ReturnRepo from '../repositories/returnRepository.js';
import * as ProductRepo from '../repositories/productRepository.js';
import * as OrderRepo from '../repositories/orderRepository.js';
import * as userRepo from '../repositories/userRepository.js';
import * as OrderService from '../services/orderService.js';

import { generateReturnID } from '../utils/idGenerator.js';

export const processReturnRequest = async (userId, orderId, body) => {
    const validReturnTypes = ['Return', 'Exchange'];
    const validReasons = ['size', 'defective', 'not-as-described'];
    const validRefundModes = ['bank', 'wallet'];

    if (!validReturnTypes.includes(body.returnType)) {
        throw new Error("Invalid return request type selected.");
    }

    if (!validReasons.includes(body.reason)) {
        throw new Error("Invalid return reason selected.");
    }

    if (body.refundMode && !validRefundModes.includes(body.refundMode)) {
        throw new Error("Invalid refund method selected.");
    }

    if (!body.pickupDate) {
        throw new Error("Pickup date is required.");
    }

    const selectedDate = new Date(body.pickupDate);
    selectedDate.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const maxDate = new Date(tomorrow);
    maxDate.setDate(maxDate.getDate() + 14);

    if (isNaN(selectedDate.getTime()) || selectedDate < tomorrow || selectedDate > maxDate) {
        throw new Error("Pickup date must be scheduled between tomorrow and the next 14 days.");
    }

    const order = await OrderService.getUserOrderDetails(orderId, userId);
    if (!order) {
        throw new Error("Order not found or unauthorized.");
    }

    const existingReturn = await ReturnRepo.findByOrderId(order.orderId, body.itemId);
    if (existingReturn) {
        throw new Error("A return request has already been made for this specific order item.");
    }

    const item = order.items.find(i =>
        i._id.toString() === body.itemId.toString()
    );

    if (!item) {
        throw new Error("The requested product was not found in this order.");
    }

    if (item.isReturned || (item.status && item.status.toLowerCase() === 'cancelled')) {
        throw new Error("This item is not eligible for a return or exchange.");
    }


    const basePrice = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    const itemSubtotal = basePrice * quantity;

    const orderSubtotal = Number(order.subtotal) || itemSubtotal;
    const orderTotalDiscount = Number(order.discount) || 0;
    const orderTotalTax = Number(order.tax) || 0;

    let itemDiscountShare = 0;
    let itemTaxShare = 0;

    if (orderSubtotal > 0) {
        const proportion = itemSubtotal / orderSubtotal;
        itemDiscountShare = orderTotalDiscount * proportion;
        itemTaxShare = orderTotalTax * proportion;
    }

    const discountedItemSubtotal = Math.max(0, itemSubtotal - itemDiscountShare);
    const finalItemAmount = Number((discountedItemSubtotal + itemTaxShare).toFixed(2));

    const generatedId = generateReturnID();

    const pickupAddressToUse = body.pickupAddress || order.deliveryAddress;

    const returnData = {
        userId,
        orderId: order.orderId,
        returnId: generatedId,
        productId: body.productId,
        itemId: body.itemId,
        variantId: item.variantId,
        productName: item.productName,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        productImage: item.productImage,
        price: finalItemAmount,            
        description: body.description ? body.description.trim() : '',
        returnType: body.returnType,
        reason: body.reason,
        refundMode: body.refundMode || 'wallet',
        refundAmount: finalItemAmount,     
        expectedPickupDate: selectedDate,
        pickupAddress: pickupAddressToUse,
        returnStatus: 'Requested'
    };

    const savedReturn = await ReturnRepo.saveReturn(returnData);

    await ReturnRepo.updateSpecificOrderItemStatus(order.orderId, body.itemId, body.productId, "Return Requested");

    return savedReturn;
};

export const getReturnDetailsById = async (returnId) => {
    const returnData = await ReturnRepo.findReturnById(returnId);
    
    if (!returnData) {
        throw new Error('Return request not found');
    }
    return returnData;
};

export const checkIfReturnExists = async (orderIdString, itemId) => {
    const existing = await ReturnRepo.findByOrderId(orderIdString, itemId);
    return !!existing;
};

export const getAllReturnsPaginated = async (page = 1, limit = 10, searchQuery = '') => {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    let query = {};
    if (searchQuery && searchQuery.trim() !== '') {
        const regex = new RegExp(searchQuery.trim(), 'i');
        query = {
            $or: [
                { returnId: regex },
                { orderId: regex },
                { productName: regex },
                { reason: regex }
            ]
        };
    }

    const { returns, totalReturns } = await ReturnRepo.findAllReturns(skip, limitNumber, query);
    const totalPages = Math.ceil(totalReturns / limitNumber) || 1;

    return {
        returns,
        searchQuery,
        startIndex: skip,
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            totalPages: totalPages,
            totalReturns: totalReturns,
            hasPrevPage: pageNumber > 1,
            hasNextPage: pageNumber < totalPages,
            prevPage: pageNumber - 1,
            nextPage: pageNumber + 1
        }
    };
};


export const getReturnFormByIdService = async (userId, formId) => {
    try {
        const user = await userRepo.findById(userId);
        if (!user || !user.returnForms) return null;
        
        return user.returnForms.find(form => form._id.toString() === formId.toString());
    } catch (error) {
        console.error("Service Error (getReturnFormByIdService):", error.message);
        throw error;
    }
};

export const editReturnFormCheckout = async (userId, formId, updateData) => {
    try {
        const existingForm = await getReturnFormByIdService(userId, formId);
        if (!existingForm) {
            const error = new Error("Return form not found");
            error.statusCode = 404;
            throw error;
        }

        const updatedUser = await userRepo.findByIdAndUpdate(
            userId,
            { $set: { "returnForms.$": { ...updateData, _id: formId } } },
            { returnDocument: 'after' }
        );

        if (!updatedUser || !updatedUser.returnForms) {
            throw new Error("Failed to update return form");
        }

        return updatedUser.returnForms.find(form => form._id.toString() === formId.toString());
    } catch (error) {
        console.error("Service Error (editReturnFormCheckout):", error.message);
        throw error;
    }
};

