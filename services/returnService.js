import * as ReturnRepo from '../repositories/ReturnRepository.js';
import * as OrderService from './OrderService.js';
import { generateReturnID } from '../utils/idGenerator.js';
import ReturnModel from '../models/ReturnModel.js';

export const processReturnRequest = async (userId, orderId, body) => {
    const order = await OrderService.getUserOrderDetails(orderId, userId);
    
    const existingReturn=await ReturnModel.findOne({orderId:orderId});
    if(existingReturn){
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
        productName: item.productName,      
        size: item.size,                    
        quantity: item.quantity,            
        productImage: item.productImage,      
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


export const getReturnDetailsById = async (returnId) => {
    const returnData = await ReturnRepo.findReturnById(returnId);
    
    if (!returnData) {
        throw new Error('Return request not found');
    }
    return returnData;
};

export const checkIfReturnExists = async (orderIdString) => {
    const existing = await ReturnModel.findOne({ orderId: orderIdString});
    console.log("Existing:",existing);
    return !!existing;
};