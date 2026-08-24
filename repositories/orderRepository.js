import Order from '../models/orderModel.js';
import Cart from '../models/cartModel.js';
import User from '../models/userModel.js';
import * as ProductRepo from './productRepository.js';
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

export const saveOrder = async (orderToSave) => {
    const order = new Order(orderToSave);
    const result = await order.save();
    return result; 
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


export const updateOrder = async (orderId, updateData, options = {}) => {
    const filter = { _id: orderId };
    
    if (updateData.status && updateData.status.toLowerCase() === 'cancelled') {
        filter.status = { $ne: 'cancelled' }; 
    }

    return await Order.findOneAndUpdate(
        filter, 
        updateData, 
        { returnDocument: 'after', ...options }
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


export const countActiveOrders = async () => {
    return await Order.countDocuments({ 
                status: { $nin: ['Cancelled', 'cancelled', 'Returned', 'returned','delivered','Delivered'] }
    });
};

export const cancelledOrder=async()=>{
    return await Order.countDocuments({
        status:{$in:['cancelled','Cancelled']}
    });
};

export const updateStatus = async (orderId, newStatus) => {
    const order = await Order.findById(orderId);
    if (!order) return null;

    order.status = newStatus;

    if (newStatus.trim().toLowerCase() === 'cancelled') {
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemStat = (item.status || '').toLowerCase();
                if (itemStat !== 'returned' && itemStat !== 'refunded') {
                    item.status = 'Cancelled';
                }
            });
        }
    } else {
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemStat = (item.status || '').toLowerCase();
                if (itemStat !== 'cancelled' && itemStat !== 'returned' && itemStat !== 'refunded') {
                    item.status = newStatus;
                }
            });
        }
    }

    const updatedOrder = await order.save();
    return updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder;
};


export const updatePaymentStatus = async (orderId, paymentId, status) => {
    const order = await Order.findById(orderId);
    if (!order) return null;

    const previousStatus = (order.status || '').toLowerCase();
    const newStatus = status.toLowerCase();

    if (previousStatus === 'failed' && newStatus === 'placed') {
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                await ProductRepo.decreaseStock(
                    item.productId, 
                    item.variantId, 
                    item.size, 
                    item.quantity
                );
            }
        }
    }

    order.status = status; 
    order.paymentId = paymentId;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemStat = (item.status || '').toLowerCase();
            if (itemStat === 'failed' || itemStat === 'pending') {
                item.status = status; 
            }
        });
    }

    const updatedOrder = await order.save();
    return updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder;
};


export const findOneAndUpdate = async (filter, update) => {
    return await Order.findOneAndUpdate(filter, update, { new: true });
};

export const aggregateTotalSales = async () => {
    const result = await Order.aggregate([
        {
            $match: {
                status:  'delivered'
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$finalAmount" }
            }
        }
    ]);
    return result.length > 0 ? result[0].totalSales : 0;
};

export const findByCustomOrderId = async (orderId, options = {}) => {
    return await Order.findOne({ orderId: orderId }, null, options).lean();
};

export const findOrderByRazorpayId = async (razorpayOrderId) => {
    try {
        return await Order.findOne({ razorpayOrderId: razorpayOrderId });
    } catch (error) {
        throw new Error(error.message);
    }
};



export const markOrderAsFailed = async (orderId) => {
    const order = await Order.findById(orderId);
    if (!order || order.status.toLowerCase() === 'failed') return null;

    for (const item of order.items) {
        await ProductRepo.increaseStock(
            item.productId, 
            item.variantId, 
            item.size, 
            item.quantity
        );
    }

    order.status = 'failed';

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemStat = (item.status || '').toLowerCase();
            if (itemStat !== 'cancelled' && itemStat !== 'returned' && itemStat !== 'refunded') {
                item.status = 'failed';
            }
        });
    }

    const updatedOrder = await order.save();
    return updatedOrder.toObject ? updatedOrder.toObject() : updatedOrder;
};