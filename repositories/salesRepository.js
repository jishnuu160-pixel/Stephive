import Order from '../models/orderModel.js';
import User from '../models/userModel.js'; 

export const getOrdersByDate = async (startDate, endDate) => {
    return await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { 
            $nin: ['Cancelled', 'cancelled', 'Returned', 'returned'] 
        }
    })
   .populate('user_id', 'fullName')
    .sort({ createdAt: -1 });
};

export const getSalesChartDataFromDB = async (startDate, groupFormat, endDate = null) => {
    const matchQuery = {
        createdAt: { $gte: startDate },
        status: { $nin: [ 'cancelled', 'returned'] }
    };

    if (endDate) {
        matchQuery.createdAt.$lte = endDate;
    }

    return await Order.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: groupFormat,
                totalSales: { $sum: "$finalAmount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};


export const findTopCategories = async () => {
    return await Order.aggregate([
        { 
            $match: { 
                status: { $nin: ['cancelled','returned','delivered'] } 
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