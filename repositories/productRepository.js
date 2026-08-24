import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import Category from '../models/categoryModel.js';
import { isOfferActiveByDate } from '../utils/dateHelper.js';
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
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { 
            returnDocument: 'after',
            runValidators: true    
        }
    );

    if (!updatedProduct) {
        throw new Error("Product update failed: Product not found in database.");
    }
    return updatedProduct;
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
      return await Product.find(searchFilter)
         .sort(sort)
         .skip(skip)
         .limit(limit)
         .lean()
};

export const decreaseStock = async (productId, variantId, size, quantity, session = null) => {
    const numericQuantity = Number(quantity);
    const numericSize = Number(size);

    return await Product.updateOne(
        { _id: new mongoose.Types.ObjectId(productId) },
        { $inc: { "variants.$[v].sizes.$[s].stock": -numericQuantity } },
        { 
            arrayFilters: [
                { "v._id": new mongoose.Types.ObjectId(variantId) },
                { "s.size": numericSize, "s.stock": { $gte: numericQuantity } }
            ],
            session
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
            $inc: { "variants.$[v].sizes.$[s].stock": Number(quantity) } 
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
            const isValidByDate = isOfferActiveByDate(cat.offer.startDate, cat.offer.expiryDate);
            
            if (isValidByDate) {
                const catVal = Number(cat.offer.discountValue) || 0;
                if (catVal > highestCatDiscount) {
                    highestCatDiscount = catVal;
                }
            }
        }
    });
    return highestCatDiscount;
};


export const findTopProducts = async () => {
    return await Order.aggregate([
        { 
            $match: { 
                status: { $nin: ['cancelled', 'returned'] } 
            } 
        },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $unwind: {
                path: '$productInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        { 
            $group: {
                _id: '$items.productId',
                totalQuantity: { $sum: '$items.quantity' },
                totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                productName: { $first: '$productInfo.productName' },
                productImage: { 
                    $first: { 
                        $arrayElemAt: [{ $arrayElemAt: ['$productInfo.variants.images', 0] }, 0] 
                    } 
                },
                variants: { $first: '$productInfo.variants' }
            } 
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 1,
                totalQuantity: 1,
                totalRevenue: 1,
                productName: { $ifNull: ['$productName', 'Unknown Product'] },
                productImage: { $ifNull: ['$productImage', ''] },
                stock: {
                    $sum: {
                        $map: {
                            input: { $ifNull: ['$variants', []] },
                            as: 'variant',
                            in: {
                                $sum: '$$variant.sizes.stock'
                            }
                        }
                    }
                }
            }
        }
    ]);
};

export const getBestSellers = async () => {
    return await Order.aggregate([
        { 
            $match: { 
                status: { $nin: [ 'cancelled', 'returned'] } 
            } 
        },
        { $unwind: '$items' },
        { 
            $group: {
                _id: '$items.productId',
                totalQuantity: { $sum: '$items.quantity' }
            } 
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 8 },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productDoc'
            }
        },
        { $unwind: '$productDoc' },
        {
            $match: {
                'productDoc.isListed': true,
                'productDoc.isBlocked': { $ne: true }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: 'productDoc.Category',
                foreignField: '_id',
                as: 'productDoc.Category'
            }
        },
        {
            $unwind: {
                path: '$productDoc.Category',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $replaceRoot: { newRoot: '$productDoc' }
        }
    ]);
};


