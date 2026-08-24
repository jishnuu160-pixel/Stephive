import Admin from '../models/adminModel.js';
import User from '../models/userModel.js';

class AdminRepository {

   async findAdminByEmail(email) {
      return await Admin.findOne({ email });
   }

   async findCustomers(
      query,
      skip,
      limit
   ) {
      return await User.find(query)
         .sort({ _id: -1 })
         .skip(skip)
         .limit(limit)
         .lean();
   }

   async countCustomers(query) {
      return await User.countDocuments(query);
   }

   async findUserById(userId) {
      return await User.findById(userId);
   }
}

export default new AdminRepository();