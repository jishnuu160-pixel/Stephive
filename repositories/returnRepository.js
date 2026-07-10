import Return from '../models/ReturnModel.js';
import Order from '../models/orderModel.js';

export const saveReturn = async (returnData) => {
    return await new Return(returnData).save();
};

export const findByOrderId = async (orderId) => {
    return await Return.findOne({ orderId: orderId });
};

export const findReturnById = async (id) => {
    if (id.length === 24) {
        return await Return.findById(id).populate('productId');
    }
    return await Return.findOne({ returnId: id }).populate('productId');
};

export const findAllReturns = async () => {
    return await Return.find()
        .populate('userId', 'fullName email')
        .populate('orderId', 'orderId')
        .sort({ createdAt: -1 })
        .lean(); 
};


export const updateReturnStatusInDb = async (mongoId, status) => {
    return await Return.findByIdAndUpdate(mongoId, { status }, { new: true });
};


export const updateOrderStatusInDb = async (orderId, status) => {
    return await Order.findOneAndUpdate(
        { orderId: orderId }, 
        { status: status }, 
        { new: true }
    );
};