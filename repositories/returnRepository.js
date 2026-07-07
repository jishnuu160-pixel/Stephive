import Return from '../models/ReturnModel.js';

export const saveReturn = async (returnData) => {
    try {
        const newReturn = new Return(returnData);
        return await newReturn.save();
    } catch (error) {
        throw new Error(`Error saving return: ${error.message}`);
    }
};

export const findReturnById = async (id) => {
    return await Return.findById(id).populate('orderId productId');
};

export const findAllReturns = async () => {
    return await Return.find().sort({ createdAt: -1 });
};

export const updateReturnStatus = async (id, status) => {
    return await Return.findByIdAndUpdate(
        id, 
        { returnStatus: status }, 
        { new: true }
    );
};