import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import mongoose from 'mongoose';

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

export const findProducts = async (filter, sort, skip, limit) => {
    return await Product.find(filter)
        .populate({
            path: 'Category',
            populate: {
                path: 'parentCategory',
                model: 'Category'
            }
        })
        .sort(sort)
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

export const decreaseStock = async (productId, variantId, size, quantity) => {
    return await Product.updateOne(
        { 
            _id: new mongoose.Types.ObjectId(productId),
            "variants": {
                $elemMatch: {
                    "_id": new mongoose.Types.ObjectId(variantId),
                    "sizes": {
                        $elemMatch: {
                            "size": Number(size),
                            "stock": { $gte: quantity } 
                        }
                    }
                }
            }
        },
        { 
            $inc: { "variants.$[v].sizes.$[s].stock": -quantity } 
        },
        { 
            arrayFilters: [
                { "v._id": new mongoose.Types.ObjectId(variantId) },
                { "s.size": Number(size) }
            ] 
        }
    );
};

export const increaseStock = async (productId, variantId, size, quantity, session = null) => {
    return await Product.updateOne(
        { 
            _id: new mongoose.Types.ObjectId(productId),
            "variants._id": new mongoose.Types.ObjectId(variantId),
            "variants.sizes.size": Number(size)
        },
        { 
            $inc: { "variants.$[v].sizes.$[s].stock": quantity } 
        },
        { 
            arrayFilters: [
                { "v._id": new mongoose.Types.ObjectId(variantId) },
                { "s.size": Number(size) }
            ],
            session 
        }
    );
};

export const getCategoryIdsByNames = async (names) => {
    return await Category.find({ name: { $in: names } }).select('_id');
};


export const getHighestCategoryDiscountForIds = async (categoryIds) => {
    if (!categoryIds || categoryIds.length === 0) return 0;
    
    const objectIds = categoryIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) return 0;

    const categories = await Category.find({ _id: { $in: objectIds } }).lean();
    let highestCatDiscount = 0;

    categories.forEach(cat => {
        const isOfferActive = cat.offer && cat.offer.isActive === true;
        
        if (isOfferActive) {
            const catVal = Number(cat.offer.discountValue) || 0;
            if (catVal > highestCatDiscount) {
                highestCatDiscount = catVal;
            }
        }
    });

    return highestCatDiscount;
};