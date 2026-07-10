import Order from '../models/OrderModel.js';
import Cart from '../models/cartModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

export const findByUserId = async (userId) => {
    try {
        return await User.findById(userId);
    } catch (error) {
        throw new Error('Error finding user by ID'); 
    }   
};

export const getCartByUserId = async (userId) => {
    return await Cart.findOne({ userId: userId }) 
        .populate('items.productId')
        .lean();
};

export const countOrdersByUserId = async (userId) => {
    try {
        return await Order.countDocuments({ user_id: userId });
    } catch (error) {
        throw new Error('Error counting orders for user');
    }
};

export const saveOrder = async (orderData) => {
    return await Order.create(orderData);
};

export const findOrdersByUserId = async (user_id, limit, skip, sortOrder=-1,search) => {
    let query={user_id:user_id};

if (search) {
    query['items.productName'] = { $regex: `\\b${search}\\b`, $options: 'i' };
}
    return await Order.find(query) 
        .sort({ createdAt: sortOrder })  
        .skip(skip)
        .limit(limit)
        .lean();
};


export const findOrderById = async (orderId, options = {}) => {
    return await Order.findById(orderId, null, options).lean();
};


export const updateOrder = async (orderId, updateData, session = null) => {
    return await Order.findByIdAndUpdate(
        orderId, 
        { $set: updateData }, 
        { session, new: true }
    );
};

export const clearCartByUserId = async (userId) => {
    return await Cart.deleteOne({ userId: userId });
};

export const findUserOrderById = async (orderId, userId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`Invalid ID format provided: OrderId=${orderId}, UserId=${userId}`);
            return null; 
        }

        return await Order.findOne({ 
            _id: new mongoose.Types.ObjectId(orderId), 
            user_id: new mongoose.Types.ObjectId(userId) 
        })
        .populate('user_id', 'fullName email')
        .populate('items.productId', 'productName productImage')
        .lean();

    } catch (error) {
        console.error("DEBUG: Repo Error:", error);
        throw new Error('Error retrieving order details from database');
    }
};

export const pullItemFromOrder = async (orderId, itemId) => {
    return await Order.findByIdAndUpdate(
        orderId,
        { $pull: { items: { _id: itemId } } },
        { new: true }
    ).lean();
};


export const findOrdersWithSearch = async (search, limit, skip) => {
    let query = {};
    
    if (search) {
        const users = await User.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');
        const userIds = users.map(u => u._id);

        query.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { user_id: { $in: userIds } }
        ];
    }

    return await Order.find(query)
        .populate('user_id', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

export const countOrdersWithSearch = async (search) => {
    let query = {};
    if (search) {
        const users = await User.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');
        const userIds = users.map(u => u._id);
        query.$or = [
            { orderId: { $regex: search, $options: 'i' } },
            { user_id: { $in: userIds } }
        ];
    }
    return await Order.countDocuments(query);
};

export const countAllOrders = async (query) => {
    return await Order.countDocuments(query);
};

export const updateStatus = async (orderId, newStatus) => {
    return await Order.findByIdAndUpdate(
        orderId, 
        { status: newStatus }, 
        { new: true } 
    ).lean();
};

