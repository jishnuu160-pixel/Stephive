import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";


export const findActiveProducts = async () => {
    return await Product.find({ isBlocked: false }).lean();
};


export const findActiveCategories = async () => {
    return await Category.find({ isListed: true })
        .populate({
            path: 'parentCategory',
            model: 'Category', 
            select: 'name'    
        })
        .lean();
};


export const updateProductOffer = async (productId, updatePayload) => {
    return await Product.findByIdAndUpdate(
        productId,
        { $set: updatePayload },
        { new: true }
    );
};


export const updateCategoryOffer = async (categoryId, updatePayload) => {
    return await Category.findByIdAndUpdate(
        categoryId,
        { $set: updatePayload },
        { new: true }
    );
};

export const updateManyCategoryOffers = async (categoryIds, updatePayload) => {
    return await Category.updateMany(
        { _id: { $in: categoryIds } },
        { $set: updatePayload }
    );
};

export const findParentsByName = async (parentsArray) => {
    return await Category.find({ name: { $in: parentsArray } });
};

export const findSubCategoriesByParentIds = async (subCategoryName, parentIds) => {
    return await Category.find({
        name: subCategoryName,
        parentCategory: { $in: parentIds }
    });
};

export const updateManyCategoriesByIds = async (targetIds, updatePayload) => {
    return await Category.updateMany(
        { _id: { $in: targetIds } },
        { $set: updatePayload }
    );
};