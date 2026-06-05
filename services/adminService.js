import  adminRepo from '../repositories/adminRepository.js';
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
















