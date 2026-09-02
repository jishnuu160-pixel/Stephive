import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";

export const findProductById = async (productId) => {
    return await Product.findById(productId).lean();
};

export const addProductOffer = async (productId, offerData) => {
    return await Product.findByIdAndUpdate(
        productId,
        {
            $push: {
                offer: offerData
            }
        },
        { new: true }
    );
};


export const replaceProductOffers = async (productId, offers) => {
    return await Product.findByIdAndUpdate(
        productId,
        {
            $set: {
                offer: offers
            }
        },
        {
            new: true
        }
    );
};

export const replaceCategoryOffers = async (categoryId, offers) => {
    return await Category.findByIdAndUpdate(
        categoryId,
        {
            $set: {
                offer: offers
            }
        },
        {
            new: true
        }
    );
};

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


export const findCategoryOffersByIds = async (categoryIds) => {
    return await Category.find({
        _id: { $in: categoryIds }
    })
        .select('name offer')
        .lean();
};

export const removeProductOffer = async (productId, offerId) => {
    return await Product.findByIdAndUpdate(
        productId,
        {
            $pull: {
                offer: { _id: offerId }
            }
        },
        { new: true }
    );
};

export const removeCategoryOffer = async (categoryId, offerId) => {
    return await Category.findByIdAndUpdate(
        categoryId,
        {
            $pull: {
                offer: { _id: offerId }
            }
        },
        { new: true }
    );
};