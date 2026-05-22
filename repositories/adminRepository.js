import Admin from '../models/adminModel.js';
import Category from '../models/categoryModel.js'

class AdminRepository {
    async findAdminByEmail(email) {
        return await Admin.findOne({ email: email });
    }
}

export default new AdminRepository();

export const findCategoriesWithPagination = async(query,skip,limit)=>{
    return await Category.find(query).populate('parentCategory').skip(skip).limit(limit).sort({createdAt:-1}).lean();
};

export const countCategories= async(query)=>{
    return await Category.countDocuments(query);
};

