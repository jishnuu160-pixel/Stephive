import Admin from '../models/adminModel.js';
import Category from '../models/categoryModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';

class AdminRepository {

   async findAdminByEmail(email) {
      return await Admin.findOne({ email });
   }

   async findSubCategoriesByParent(parentId) {
   return await Category.find({
      parentCategory: parentId,
      isListed: true
   }).lean();
}

   async findCategoriesWithPagination(
      query,
      skip,
      limit
   ) {
      return await Category.find(query)
         .populate('parentCategory')
         .skip(skip)
         .limit(limit)
         .sort({ createdAt: -1 })
         .lean();
   }

   async countCategories(query) {
      return await Category.countDocuments(query);
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

   // =========================
   // USER
   // =========================

   async findUserById(userId) {
      return await User.findById(userId);
   }

   async saveUser(user) {
      return await user.save();
   }

   // =========================
   // CATEGORY
   // =========================

   async findCategoryById(categoryId) {
      return await Category.findById(categoryId)
         .populate('parentCategory');
   }

   async findParentCategories() {
      return await Category.find({
         $or: [
            { parentCategory: null },
            { parentCategory: { $exists: false } }
         ]
      }).lean();
   }

   async findAllCategories() {
      return await Category.find({}).lean();
   }

   async findSubCategories() {
      return await Category.find({
         parentCategory: { $ne: null }
      }).lean();
   }

async findCategoryByNameAndParent(
   name,
   parentCategory
) {
   return await Category.findOne({
      name: {
         $regex: new RegExp(
            `^${name}$`,
            'i'
         )
      },
      parentCategory: parentCategory || null
   });

}

async findProductByNameAndCategory(productName, categoryId) {
   return await Product.findOne({
      productName: {
         $regex: new RegExp(`^${productName}$`, 'i')
      },
      Category: categoryId
   });
}

async createCategory(categoryData) {
   try {
      console.log("🔥 INSERTING INTO DB:", categoryData);

      const result = await Category.create(categoryData);

      console.log("✅ INSERT SUCCESS:", result);

      return result;

   } catch (err) {
      console.log("❌ MONGODB CREATE ERROR:", err.message);
      console.log(err); // VERY IMPORTANT

      throw err;
   }
}
   async updateCategory(
      categoryId,
      updateData
   ) {
      return await Category.findByIdAndUpdate(
         categoryId,
         updateData,
         {
            new: true,
            runValidators: true
         }
      );
   }

   async saveCategory(category) {
      return await category.save();
   }

   // =========================
   // PRODUCT
   // =========================

   async findProducts(
      searchFilter,
      skip,
      limit
   ) {
      return await Product.find(searchFilter)
         .populate({
            path: 'Category',
            populate: {
               path: 'parentCategory',
               model: 'Category'
            }
         })
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean();
   }

   async countProducts(searchFilter) {
      return await Product.countDocuments(
         searchFilter
      );
   }

async findProductById(productId) {
   return await Product.findById(productId)
      .populate({
         path: 'Category',
         populate: { path: 'parentCategory' }
      })
}

   async createProduct(productData) {
      return await Product.create(productData);
   }

   async updateProduct(
      productId,
      updateData
   ) {
      return await Product.findByIdAndUpdate(
         productId,
         updateData,
         { new: true }
      );
   }

   async saveProduct(product) {
      return await product.save();
   }
}



export default new AdminRepository();