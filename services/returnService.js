import * as ReturnRepo from '../repositories/ReturnRepository.js';
import * as OrderService from './OrderService.js';

export const processReturnRequest = async (userId, orderId, body) => {
    const order = await OrderService.getUserOrderDetails(orderId, userId);
    
    const item = order.items.find(i => i.productId.toString() === body.productId);
    const refundAmount = item ? item.price : 0;

    const returnData = {
        userId,
        orderId,
        productId: body.productId,
        returnType: body.returnType,
        reason: body.reason,
        refundMode: body.refundMode,
        refundAmount: refundAmount, 
        expectedPickupDate: body.pickupDate,
        pickupAddress: order.deliveryAddress,
        returnStatus: 'Pending'
    };

    return await ReturnRepo.saveReturn(returnData);
};