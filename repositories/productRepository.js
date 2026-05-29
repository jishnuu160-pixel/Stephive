import Product from '../models/productModel.js';

export const findProducts = (query, sort, skip, limit) => {
    return Product.find(query)
        .populate('Category')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

export const countProducts = (query) => {
    return Product.countDocuments(query);
};

export const findProductById = (id) => {
    return Product.findById(id).populate('Category').lean();
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

export const distinctBrands = (query) => {
    return Product.distinct('brand', query);
};

export const distinctMaterials = (query) => {
    return Product.distinct('material', query);
};