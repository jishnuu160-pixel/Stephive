import Return from '../models/returnModel.js';
import Order from '../models/orderModel.js';

export const saveReturn = async (returnData) => {
    return await new Return(returnData).save();
};

export const findByOrderId = async (orderId, itemId) => {
    const query = { orderId };
    if (itemId) {
        query.itemId = itemId;
    }
    return await Return.findOne(query);
};

export const getOrderById = async (orderId) => {
    return await Order.findOne({ orderId: orderId });
};

export const findReturnById = async (id) => {
    if (id.length === 24) {
        return await Return.findById(id).populate('productId');
    }
    return await Return.findOne({ returnId: id }).populate('productId');
};

export const findAllReturns = async (skip, limit, query = {}) => {
    const returns = await Return.find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); 

    const totalReturns = await Return.countDocuments(query);

    return {
        returns,
        totalReturns
    };
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

export const updateSpecificOrderItemStatus = async (orderIdentifier, itemId, status) => {
    const isItemIdMongoId = itemId && (typeof itemId === 'string' ? itemId.length === 24 : true);
    const orderIsMongoId = orderIdentifier && (typeof orderIdentifier === 'string' ? orderIdentifier.length === 24 : true);

    return await Order.findOneAndUpdate(
        {
            $or: [
                { orderId: orderIdentifier },
                { _id: orderIsMongoId ? orderIdentifier : null }
            ],
            "items._id": isItemIdMongoId ? itemId : itemId
        },
        { 
            $set: { "items.$.status": status.toLowerCase() } 
        },
        { new: true }
    );
};



export const findAllReturnsForOrder = async (orderId) => {
    return await Return.find({ orderId: orderId });
};