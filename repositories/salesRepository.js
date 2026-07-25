import Order from '../models/orderModel.js';
import User from '../models/userModel.js'; 

export const getOrdersByDate = async (startDate, endDate) => {
    return await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { 
            $nin: ['Cancelled', 'cancelled', 'Returned', 'returned','delivered','Delivered'] 
        }
    })
   .populate('user_id', 'fullName')
    .sort({ createdAt: -1 });
};

export const getSalesChartDataFromDB = async (startDate, groupFormat) => {
    return await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                status: { $nin: ['Cancelled', 'cancelled', 'Returned', 'returned','delivered','Delivered'] }
            }
        },
        {
            $group: {
                _id: groupFormat,
                totalSales: { $sum: "$finalAmount" }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
};


export const findTopCategories = async () => {
    return await Order.aggregate([
        { 
            $match: { 
                status: { $nin: ['Cancelled','cancelled','returned', 'Returned','delivered', 'Delivered'] } 
            } 
        },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { 
            $unwind: { 
                path: '$productInfo', 
                preserveNullAndEmptyArrays: true 
            } 
        },
        {
            $lookup: {
                from: 'Categories', 
                localField: 'productInfo.Category',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        },
        { 
            $unwind: { 
                path: '$categoryInfo', 
                preserveNullAndEmptyArrays: true 
            } 
        },
        
        { 
            $group: {
                _id: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            } 
        },
        
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        
        {
            $project: {
                _id: 0,
                categoryName: '$_id',
                totalQuantity: 1,
                totalRevenue: 1
            }
        }
    ]);
};