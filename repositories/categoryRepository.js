import Category from '../models/categoryModel.js';

export const findParentCategory = (nameRegex) => {
    return Category.findOne({ name: { $regex: nameRegex } }).lean();
};


export const findSubcategories = (parentId) => {
    return Category.find({
        $or: [
            { parentCategory: parentId },
            { parentId }
        ],
        isListed: true
    }).lean();
};


export const findCategoryById=async (categoryId)=>{
      return await Category.findById(categoryId)
         .populate('parentCategory');
};


export const findParentCategories=async ()=>{
         return await Category.find({
            $or: [
               { parentCategory: null },
               { parentCategory: { $exists: false } }
            ]
 }).lean();
};
   

export const findAllCategories= async ()=> {
      return await Category.find({}).lean();
};


export const findSubCategories= async()=>{
      return await Category.find({
         parentCategory: { $ne: null }
      }).lean();
};


export const findCategoryByNameAndParent= async( name, parentCategory)=>{
   return await Category.findOne({
      name: {
         $regex: new RegExp(
            `^${name}$`,
            'i'
         )
      },
      parentCategory: parentCategory || null
   });
};



export const createCategory= async(categoryData)=>{
   try {

      const result = await Category.create(categoryData);

      return result;

   } catch (err) {
      console.log("❌ MONGODB CREATE ERROR:", err.message);
      console.log(err); 

      throw err;
   }
};


 export const updateCategory= async( categoryId, updateData)=>{
      return await Category.findByIdAndUpdate(
         categoryId,
         updateData,
         {
            new: true,
            runValidators: true
         }
      );
 };

export const countCategories= async(query)=>{
      return await Category.countDocuments(query);
}; 


export const saveCategory= async(category)=>{
      return await category.save();
};


export const findProductByNameAndCategory= async(productName, categoryId)=>{
   return await Product.findOne({
      productName: {
         $regex: new RegExp(`^${productName}$`, 'i')
      },
      Category: categoryId
   });
};


export const findCategoriesWithPagination= async( query,skip, limit)=>{
      return await Category.find(query)
         .populate('parentCategory')
         .skip(skip)
         .limit(limit)
         .sort({ createdAt: -1 })
         .lean();
};


export const findSubCategoriesByParent = async (parentId) => {
    return await Category.find({ parentCategory: parentId, isListed: true }).lean();
};