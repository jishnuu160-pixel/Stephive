import * as OfferRepo from '../repositories/offerRepository.js';

/**
 * Compiles all data required to render the unified offer management dashboard
 * @returns {Promise<Object>} Formatted data containing dropdown lists and active offers
 */
export const getOfferPageData = async () => {
    const [allProducts, allCategories] = await Promise.all([
        OfferRepo.findActiveProducts(),
        OfferRepo.findActiveCategories()
    ]);

    const subCategories = allCategories.filter(
        category => category.parentCategory !== null && category.parentCategory !== undefined
    );

    const productOffers = allProducts.filter(product => product.offer?.isActive);
    const categoryOffers = allCategories.filter(category => category.offer?.isActive);

    return {
        allProducts,
        allCategories,
        subCategories, 
        productOffers,
        categoryOffers
    };
};


export const applyProductOffer = async (productId, discountValue) => {
    if (!productId || !discountValue) throw new Error("Missing required product parameters");
    if (discountValue <= 0 || discountValue > 100) throw new Error("Invalid discount percentage");

    const updatePayload = {
        "offer.discountValue": Number(discountValue),
        "offer.isActive": true,
        "offer.offerType": "Percentage"
    };

    return await OfferRepo.updateProductOffer(productId, updatePayload);
};


export const applyCategoryOffer = async (subCategoryName, parentCategories, discountValue) => {
    if (!subCategoryName) {
        throw new Error("Missing required subcategory parameter");
    }

    const numericDiscount = Number(discountValue);
    if (!numericDiscount || numericDiscount <= 0 || numericDiscount > 100) {
        throw new Error("Invalid discount percentage");
    }

    const parentsArray = Array.isArray(parentCategories) 
        ? parentCategories 
        : [parentCategories].filter(Boolean);

    if (parentsArray.length === 0) {
        throw new Error("Please select at least one parent department.");
    }

    const parentDocs = await OfferRepo.findParentsByName(parentsArray);
    const parentIds = parentDocs.map(doc => doc._id);

    if (parentIds.length === 0) {
        throw new Error("Could not find matching parent departments in the database.");
    }

    const targetSubCategories = await OfferRepo.findSubCategoriesByParentIds(subCategoryName, parentIds);

    if (targetSubCategories.length === 0) {
        throw new Error("No matching subcategories found under the selected departments.");
    }

    const targetIds = targetSubCategories.map(sub => sub._id);

    const updatePayload = {
        "offer.discountValue": numericDiscount,
        "offer.isActive": true,
        "offer.offerType": "Percentage"
    };

    return await OfferRepo.updateManyCategoriesByIds(targetIds, updatePayload);
};


export const removeProductOffer = async (productId) => {
    if (!productId) throw new Error("Product ID is required");

    const resetPayload = { 
        "offer.discountValue": 0, 
        "offer.isActive": false 
    };
    
    return await OfferRepo.updateProductOffer(productId, resetPayload);
};


export const removeCategoryOffer = async (categoryId) => {
    if (!categoryId) throw new Error("Category ID is required");

    const resetPayload = { 
        "offer.discountValue": 0, 
        "offer.isActive": false 
    };
    
    return await OfferRepo.updateCategoryOffer(categoryId, resetPayload);
};