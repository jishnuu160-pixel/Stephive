import adminRepo from '../repositories/adminRepository.js';
import * as OrderRepo from '../repositories/orderRepository.js';
import * as returnRepo from '../repositories/returnRepository.js';
import * as productRepo from "../repositories/productRepository.js";
import * as WalletRepo from "../repositories/walletRepository.js";
import * as salesRepo from "../repositories/salesRepository.js";


import Return from '../models/ReturnModel.js';
import bcrypt from 'bcrypt';

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
   const limit = 8;
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
    const limit = 10;
    const skip = (page - 1) * limit;

    const orders = await OrderRepo.findOrdersWithSearch(search, limit, skip);
    const totalOrders = await OrderRepo.countOrdersWithSearch(search);
    const totalPages = Math.ceil(totalOrders / limit);
   
    return {
        orders,
        startIndex: skip,
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
    const validStatuses = ['Processing', 'Shipped', 'Out of delivery', 'Delivered', 'Cancelled'];
    const order = await OrderRepo.findOrderById(orderId);
    
    if (!order) throw new Error("Order not found");
        
    const normalizedNewStatus = newStatus.trim().toLowerCase();
    const isValid = validStatuses.some(status => status.toLowerCase() === normalizedNewStatus);
    
    if (!isValid) {
        throw new Error("Invalid status update");
    }  

    const currentOrderStatus = order.status ? order.status.trim().toLowerCase() : '';
    const linearSequence = ['processing', 'shipped', 'out of delivery', 'delivered'];

    if (currentOrderStatus === normalizedNewStatus) {
        throw new Error(`Order is already in "${newStatus}" status.`);
    }

    if (currentOrderStatus === 'cancelled') {
        throw new Error("Cannot change status of a cancelled order.");
    }

    if (normalizedNewStatus === 'cancelled') {
        if (currentOrderStatus === 'delivered') {
            throw new Error("Cannot cancel an order that has already been delivered.");
        }
    } else {
        const currentIndex = linearSequence.indexOf(currentOrderStatus);
        const newIndex = linearSequence.indexOf(normalizedNewStatus);

        if (currentIndex !== -1 && newIndex !== -1) {
            if (newIndex <= currentIndex) {
                throw new Error("Orders can only move forward in status progression.");
            }
        }
    }

    if (normalizedNewStatus === 'cancelled' && currentOrderStatus !== 'cancelled') {
        
        if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
                item.status = 'Cancelled';

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
                
                const orderIdentifier = order.orderId || order._id;
                let description = `Refund for cancelled Order #${orderIdentifier}`;

                if (order.items && order.items.length === 1) {
                    const singleItem = order.items[0];
                    const itemName = singleItem.productName || singleItem.productId?.productName || 'Item';
                    const itemSize = singleItem.size ? ` (Size: ${singleItem.size})` : '';
                    description = `Refund for cancelled Order(Order #${orderIdentifier}) ${itemName}${itemSize} `;
                    
                } else if (order.items && order.items.length > 1) {
                    const firstItem = order.items[0];
                    const itemName = firstItem.productName || firstItem.productId?.productName || 'Item';
                    const itemSize = firstItem.size ? ` (Size: ${firstItem.size})` : '';
                    const extraCount = order.items.length - 1;
                    description = `Refund for cancelled Order ${itemName}${itemSize} +${extraCount} more (Order #${orderIdentifier})`;
                }

                await WalletRepo.updateWallet(
                    order.user_id, 
                    refundAmount, 
                    'credit', 
                    description, 
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
        const updatedReturn = await returnRepo.findReturnById(returnId);
        if (!updatedReturn) {
            const err = new Error("Return request not found");
            err.name = 'NotFoundError';
            throw err;
        }

        const currentStatus = (updatedReturn.status || '').trim();
        const normalizedNewStatus = (newStatus || '').trim();

        if (currentStatus === 'Rejected') {
            throw new Error("Cannot modify a return request that has already been rejected.");
        }

        if (currentStatus === 'Refunded') {
            throw new Error("Cannot modify a return request that has already been refunded.");
        }

        const updateData = { status: normalizedNewStatus };

        if (normalizedNewStatus === "Picked Up") {
            updateData.pickedUpAt = new Date();
        } 
        else if (normalizedNewStatus === "Refunded") {
            const prodId = updatedReturn.productId?._id || updatedReturn.productId;
            const returnQty = Number(updatedReturn.quantity) || 1;

            if (prodId && updatedReturn.size) {
                await productRepo.increaseStock(
                    prodId,
                    updatedReturn.variantId, 
                    updatedReturn.size,
                    returnQty
                );
            }

            if (updatedReturn.userId && updatedReturn.refundAmount) {
                const itemName = updatedReturn.productName || 'Item';
                const itemSize = updatedReturn.size ? ` (Size: ${updatedReturn.size})` : '';
                const orderIdentifier = updatedReturn.orderId || '';

                const walletDescription = `Refund for returned item: ${itemName}${itemSize} (Order #${orderIdentifier})`;

                await WalletRepo.updateWallet(
                    updatedReturn.userId,
                    Number(updatedReturn.refundAmount), 
                    'credit',
                    walletDescription,
                    updatedReturn.orderId
                );
            }

            await returnRepo.updateSpecificOrderItemStatus(
                updatedReturn.orderId, 
                updatedReturn.itemId, 
                'Returned'
            );
        } 
        else if (normalizedNewStatus === "Rejected") {
            await returnRepo.updateSpecificOrderItemStatus(
                updatedReturn.orderId, 
                updatedReturn.itemId, 
                'Delivered'
            );
        }

        await Return.findByIdAndUpdate(returnId, updateData);

        return await returnRepo.findReturnById(returnId);

    } catch (error) {
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
    let startDate = new Date();
    let endDate = null;
    let groupFormat;

    if (filter === 'week') {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        startDate = new Date(now);
        startDate.setDate(now.getDate() - distanceToMonday);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999); 

        groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } 
    else if (filter === 'month') {
        const year = startDate.getFullYear();
        const month = startDate.getMonth(); 
        
        startDate = new Date(year, month, 1, 0, 0, 0, 0);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        groupFormat = { $dayOfMonth: "$createdAt" }; 
    } 
    else if (filter === 'year') {
        const currentYear = startDate.getFullYear();
        startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);
        groupFormat = { $month: "$createdAt" }; 
    }

    const salesData = await salesRepo.getSalesChartDataFromDB(startDate, groupFormat, endDate);

    if (filter === 'year') {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyRevenueMap = new Array(12).fill(0);

        salesData.forEach(item => {
            const monthIndex = item._id - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyRevenueMap[monthIndex] = item.totalSales;
            }
        });
        return { labels: monthNames, values: monthlyRevenueMap };
    }

    if (filter === 'month') {
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate(); 
        const monthShortName = startDate.toLocaleString('default', { month: 'short' }); 

        const labels = [];
        const dailyRevenueMap = new Array(daysInMonth).fill(0);

        for (let i = 1; i <= daysInMonth; i++) {
            labels.push(`${monthShortName} ${i}`); 
        }

        salesData.forEach(item => {
            const dayIndex = item._id - 1; 
            if (dayIndex >= 0 && dayIndex < daysInMonth) {
                dailyRevenueMap[dayIndex] = item.totalSales;
            }
        });

        return { labels, values: dailyRevenueMap };
    }

    if (filter === 'week') {
        const weekDays = [];
        const weeklyRevenueMap = new Array(7).fill(0);
        
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayName = currentDay.toLocaleDateString('default', { weekday: 'short' }); 
            const monthName = currentDay.toLocaleDateString('default', { month: 'short' }); 
            const dateNum = currentDay.getDate(); 
            
            weekDays.push(`${dayName} ${monthName} ${dateNum}`); 
        }

        salesData.forEach(item => {
            const itemDate = new Date(item._id);
            let dayIndex = itemDate.getDay() - 1; 
            if (dayIndex === -1) dayIndex = 6; 

            if (dayIndex >= 0 && dayIndex < 7) {
                weeklyRevenueMap[dayIndex] = item.totalSales;
            }
        });

        return { labels: weekDays, values: weeklyRevenueMap };
    }

    return { labels: [], values: [] };
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

