import Product from '../models/productModel.js';

export const countProducts = async (searchFilter) => {
     return await Product.countDocuments(
        searchFilter
     );
};

export const findProductById = async (productId) => {
   return await Product.findById(productId)
      .populate({
         path: 'Category',
         populate: {
            path: 'parentCategory',
            model: 'Category'
         }
      })
      .lean();
};

export const findRelatedProducts = (product) => {
    return Product.find({
        _id: { $ne: product._id },
        $or: [
            { brand: product.brand },
            { Category: product.Category?._id || product.Category }
        ],
        isListed: true
    }).limit(4).lean();
};

export const createProduct = async (productData) => {
      return await Product.create(productData);
};

export const distinctBrandsByQuery = async (query) => {
    return await Product.distinct('brand', query);
};

export const distinctMaterials = (query) => {
    return Product.distinct('material', query);
};

export const findProducts = async (searchFilter, sort, skip, limit) => {
   return await Product.find(searchFilter)
      .populate({
         path: 'Category',
         populate: {
            path: 'parentCategory',
            model: 'Category'
         }
      })
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
};


export const updateProduct = async (productId, updateData) => {
      return await Product.findByIdAndUpdate(
         productId,
         { $set: updateData },
         { 
             returnDocument: 'after',
             runValidators: true     
         }
      );
};

export const saveProduct = async (product) => {
      return await product.save();
};

export const distinctBrands = async () => {
    return await Product.distinct('brand');
};

export const findFilteredProducts = async (filterObject) => {
    try {
        return await Product.find(filterObject)
            .populate('Category')
            .lean();
    } catch (error) {
        console.error("Repository error while fetching products:", error);
        throw error;
    }
};

export const findDuplicateProduct = async (productName, categoryId) => {
    return await Product.findOne({
        productName: {
            $regex: new RegExp(`^${productName.trim()}$`, 'i')
        },
        Category: categoryId
    }).lean();
};

export const getProductWithPagination=async (searchFilter,sort,skip,limit)=>{
      return await Product.findOne(searchFilter)
         .sort(sort)
         .skip(skip)
         .limit(limit)
         .lean()
};

