import  adminRepo from '../repositories/adminRepository.js';
import * as OrderRepo from '../repositories/orderRepository.js';
import * as returnRepo from '../repositories/returnRepository.js';
import * as productRepo from "../repositories/productRepository.js";
import * as WalletRepo from "../repositories/walletRepository.js";
import * as salesRepo from "../repositories/salesRepository.js";


import Return from '../models/ReturnModel.js';

import bcrypt from 'bcrypt';
import Order from '../models/OrderModel.js';

export const login = async (
   email,
   password
) => {

   const admin = await adminRepo.findAdminByEmail(email);

   if (!admin) {
      throw new Error("Invalid email");
   }

   const isMatch = await bcrypt.compare( password, admin.password);

   if (!isMatch) {
      throw new Error("Incorrect password");
   }

   return admin;
};

export const getCustomers = async ( query, skip, limit) => {

   return await adminRepo.findCustomers(
      query,
      skip,
      limit
   );

};

export const countCustomers = async (query) => {
   return await adminRepo.countCustomers(query);

};

export const cancelledOrder= async(query)=>{
    return await OrderRepo.cancelledOrder(query);
};

export const getCustomersPage = async (queryParams) => {

   const search = queryParams.search || '';
   const page = parseInt(queryParams.page) || 1;
   const limit = 4;
   const skip = (page - 1) * limit;

   let query = {
      isAdmin: { $ne: true }
   };

   if (search) {
      query.$and = [
         { isAdmin: { $ne: true } },
         {
            $or: [
               {
                  fullName: {
                     $regex: search,
                     $options: 'i'
                  }
               },
               {
                  email: {
                     $regex: search,
                     $options: 'i'
                  }
               }
            ]
         }
      ];

   }

   const totalUsers = await adminRepo.countCustomers(query);

   const customers =await adminRepo.findCustomers(
         query,
         skip,
         limit
      );

   const totalPages = Math.max(
         1,
         Math.ceil(totalUsers / limit)
      );

   return {
      isAdmin: true,
      title: 'Customer Management',
      activePage: 'customers',
      startIndex: skip,
      users: customers,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      searchQuery: search
   };
};

export const toggleUserStatus = async (userId) => {
   const user = await adminRepo.findUserById(userId);

   if (!user) {
      throw new Error('User not found.');
   }

   user.isBlocked = !user.isBlocked;

   await user.save();

   return {
      message: `User ${user.fullName} has been ${
         user.isBlocked
            ? 'blocked'
            : 'unblocked'
      }`
   };
};


export const getAllOrders = async (queryParams) => {
    const search = queryParams.search || '';
    const page = parseInt(queryParams.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const orders = await OrderRepo.findOrdersWithSearch(search, limit, skip);
    const totalOrders = await OrderRepo.countOrdersWithSearch(search);
    const totalPages = Math.ceil(totalOrders / limit);
   
    return {
        orders,
        pagination: {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchQuery: search
        }
    };
};


export const getOrderById = async (orderId) => {
    const order = await OrderRepo.findOrderById(orderId);
    if (!order) throw new Error("Order not found");
    
    return order;
};


export const updateOrderStatus = async (orderId, newStatus) => {
    const validStatuses = [ 'Processing', 'Shipped', 'Out of delivery', 'Delivered', 'Cancelled'];
    const order = await OrderRepo.findOrderById(orderId);
    
    if (!order) throw new Error("Order not found");
    
    console.log(`DEBUG: Attempting to update Order ${orderId} from ${order?.status} to ${newStatus}`);
    
    if (!validStatuses.includes(newStatus)) {
        throw new Error("Invalid status update");
    }  

    if (newStatus.toLowerCase() === 'cancelled' && order.status.toLowerCase() !== 'cancelled') {
        
        if (order.items) {
            for (const item of order.items) {
                await productRepo.increaseStock(
                    item.productId, 
                    item.variantId, 
                    item.size, 
                    item.quantity
                );
            }
        }

        const method = order.paymentMethod ? order.paymentMethod.trim().toLowerCase() : '';
        const paidMethods = ['razorpay', 'wallet'];

        if (paidMethods.includes(method)) {
            const refundAmount = Number(order.finalAmount) || 0;
            if (refundAmount > 0) {
                console.log(`DEBUG: Refunding ₹${refundAmount} to user ${order.user_id} for order ${order._id}`);
                await WalletRepo.updateWallet(
                    order.user_id, 
                    refundAmount, 
                    'credit', 
                    `Refund for cancelled Order #${order.orderId || order._id}`,
                    order._id
                );
            }
        }
    }

    return await OrderRepo.updateStatus(orderId, newStatus);
};


export const fetchAllReturns = async () => {
    return await Return.find()
        .populate('orderId', 'orderId') 
        .populate('userId', 'name')
        .sort({ createdAt: -1 });
};


export const changeReturnStatus = async (returnId, newStatus) => {
    try {
        const updatedReturn = await returnRepo.updateReturnStatusInDb(returnId, newStatus);

        if (!updatedReturn) throw new Error("Return request not found");

        if (newStatus === "Picked Up") {
            updatedReturn.pickedUpAt = new Date();
            await updatedReturn.save();
        } 
       else if (newStatus === "Refunded") {

    const order = await returnRepo.getOrderById(updatedReturn.orderId);

    if (order && order.items) {
        for (const item of order.items) {
            await productRepo.increaseStock(
                item.productId,
                item.variantId,
                item.size,
                item.quantity
            );
        }
    }

    console.log("Attempting wallet update for user:", updatedReturn.userId);
    
    if (updatedReturn.userId && updatedReturn.refundAmount) {
        await WalletRepo.updateWallet(
            updatedReturn.userId,
            Number(updatedReturn.refundAmount), 
            'credit',
            `Refund for return ${updatedReturn.returnId}`,
            updatedReturn.orderId
        );
    } else {
        console.error("Wallet update skipped: Missing userId or refundAmount");
    }

    await returnRepo.updateOrderStatusInDb(updatedReturn.orderId, "Returned");
} 
        else if (newStatus === "Rejected") {
            await returnRepo.updateOrderStatusInDb(updatedReturn.orderId, "Delivered");
        }

        return updatedReturn;

    } catch (error) {
        console.error("Change Status Error:", error);
        throw error;
    }
};


export const getDashboardMetrics = async () => {
    const totalOrders = await OrderRepo.countActiveOrders();
    const totalSales = await OrderRepo.aggregateTotalSales();

    const formattedSales = Number(totalSales).toLocaleString('en-IN', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    });

    return {
        totalOrders,
        totalSales: formattedSales
    };
};


export const getSalesChartData = async (filter) => {
    let groupFormat;
    let startDate = new Date();

    if (filter === 'week') {
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (filter === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (filter === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    const salesData = await salesRepo.getSalesChartDataFromDB(startDate, groupFormat);

    const labels = salesData.map(item => item._id);
    const values = salesData.map(item => item.totalSales);

    return { labels, values };
};


export const getTopSellingProducts = async () => {
    try {
        const topProducts = await productRepo.findTopProducts();
        
        return topProducts;
    } catch (error) {
        throw new Error('Error fetching top selling products: ' + error.message);
    }
};


export const getTopCategoriesService = async () => {
    try {
        return await salesRepo.findTopCategories();
    } catch (error) {
        throw new Error(`Error fetching top categories: ${error.message}`);
    }
};