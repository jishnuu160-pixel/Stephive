import * as ReturnRepo from '../repositories/ReturnRepository.js';
import * as ProductRepo from '../repositories/productRepository.js';
import * as OrderRepo from '../repositories/orderRepository.js';
import * as OrderService from './OrderService.js';
import { generateReturnID } from '../utils/idGenerator.js';

export const processReturnRequest = async (userId, orderId, body) => {

    const order = await OrderService.getUserOrderDetails(orderId, userId);

    const existingReturn = await ReturnRepo.findByOrderId(order.orderId);

    if (existingReturn) {
        throw new Error("A return request already made for this order");
    }

    const item = order.items.find(i =>
        i.productId._id.toString() === body.productId.toString()
    );

    if (!item) {
        throw new Error("The requested product was not found in this order.");
    }

    const refundAmount = item.price || 0;
    const generatedId = generateReturnID();

    const returnData = {
        userId,
        orderId: order.orderId,
        returnId: generatedId,
        productId: body.productId,
        variantId: item.variantId,
        productName: item.productName,
        size: item.size,
        quantity: item.quantity,
        productImage: item.productImage,
        returnType: body.returnType,
        reason: body.reason,
        refundMode: body.refundMode,
        refundAmount,
        expectedPickupDate: body.pickupDate,
        pickupAddress: order.deliveryAddress,
        returnStatus: 'Pending'
    };

    return await ReturnRepo.saveReturn(returnData);
};


export const getReturnDetailsById = async (returnId) => {
    const returnData = await ReturnRepo.findReturnById(returnId);
    
    if (!returnData) {
        throw new Error('Return request not found');
    }
    return returnData;
};

export const checkIfReturnExists = async (orderIdString) => {
    const existing = await ReturnRepo.findByOrderId(orderIdString);
    console.log("Existing:", existing);
    return !!existing;
};

