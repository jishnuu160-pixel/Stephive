import  adminRepo from '../repositories/adminRepository.js';
import * as OrderRepo from '../repositories/orderRepository.js';
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

   const user =
      await adminRepo.findUserById(userId);

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
    const validStatuses = [ 'Processing', 'Shipped','Out of delivery' ,'Delivered', 'Cancelled'];
    const Order = await OrderRepo.findOrderById(orderId);
    console.log(`DEBUG: Attempting to update Order ${orderId} from ${Order?.status} to ${newStatus}`);
    if (!validStatuses.includes(newStatus)) {
        throw new Error("Invalid status update");
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
    const returnRequest = await Return.findByIdAndUpdate(
        returnId, 
        { returnStatus: newStatus }, 
        { new: true }
    );
    
    if (!returnRequest) throw new Error("Return request not found");
    
    if (newStatus === 'Approved') {
    }
    return returnRequest;
};








