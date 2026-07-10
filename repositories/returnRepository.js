import Return from '../models/ReturnModel.js';

export const saveReturn = async (returnData) => {
    return await new Return(returnData).save();
};

export const findReturnById = async (id) => {
    return await Return.findOne({ returnId: id }).populate('productId');
};

export const findAllReturns = async () => {
    return await Return.find()
        .populate('userId', 'fullName email')
        .populate('orderId', 'orderId')
        .sort({ createdAt: -1 })
        .lean(); 
};

export const updateReturnStatus = async (id, status) => {
    return await Return.findOneAndUpdate(
        { returnId: id },
        { returnStatus: status }, 
        { new: true }
    );
};