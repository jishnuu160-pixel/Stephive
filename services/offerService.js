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

    const now = new Date();

    const subCategories = allCategories.filter(
        category => category.parentCategory !== null && category.parentCategory !== undefined
    );

    const productOffers = allProducts.filter(product => {
        const offer = product.offer;
        if (!offer || !offer.isActive) return false;
        if (offer.expiryDate && now > new Date(offer.expiryDate)) return false;
        return true;
    });

    const categoryOffers = allCategories.filter(category => {
        const offer = category.offer;
        if (!offer || !offer.isActive) return false;
        if (offer.expiryDate && now > new Date(offer.expiryDate)) return false;
        return true;
    });

    return {
        allProducts,
        allCategories,
        subCategories, 
        productOffers,
        categoryOffers
    };
};

export const applyProductOffer = async (productId, discountValue, startDate, expiryDate) => {
    if (!productId) throw new Error("Please select a target product.");
    if (!discountValue) throw new Error("Please enter a discount value.");
    if (!startDate) throw new Error("Please select a start date.");
    if (!expiryDate) throw new Error("Please select an expiry date.");

    const numericDiscount = Number(discountValue);
    if (isNaN(numericDiscount) || numericDiscount <= 0 || numericDiscount > 100) {
        throw new Error("Discount percentage must be between 1 and 99.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (start < today) {
        throw new Error("Start date cannot be in the past.");
    }

    if (expiry <= start) {
        throw new Error("Expiry date must be strictly later than the start date.");
    }

    const updatePayload = {
        "offer.discountValue": numericDiscount,
        "offer.isActive": true,
        "offer.offerType": "Percentage",
        "offer.startDate": new Date(startDate),
        "offer.expiryDate": new Date(expiryDate)
    };

    return await OfferRepo.updateProductOffer(productId, updatePayload);
};

export const applyCategoryOffer = async (subCategoryName, parentCategories, discountValue, startDate, expiryDate) => {
    if (!subCategoryName) throw new Error("Please select a target subcategory.");
    if (!discountValue) throw new Error("Please enter a discount rate.");
    if (!startDate) throw new Error("Please select a start date.");
    if (!expiryDate) throw new Error("Please select an expiry date.");

    const numericDiscount = Number(discountValue);
    if (isNaN(numericDiscount) || numericDiscount <= 0 || numericDiscount > 100) {
        throw new Error("Discount rate must be between 1 and 99.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (start < today) {
        throw new Error("Start date cannot be in the past.");
    }

    if (expiry <= start) {
        throw new Error("Expiry date must be strictly later than the start date.");
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
        "offer.offerType": "Percentage",
        "offer.startDate": new Date(startDate),
        "offer.expiryDate": new Date(expiryDate)
    };

    return await OfferRepo.updateManyCategoriesByIds(targetIds, updatePayload);
};

export const removeProductOffer = async (productId) => {
    if (!productId) throw new Error("Product ID is required");

    const resetPayload = { 
        "offer.discountValue": 0, 
        "offer.isActive": false,
        "offer.startDate": null,
        "offer.expiryDate": null
    };
    
    return await OfferRepo.updateProductOffer(productId, resetPayload);
};

export const removeCategoryOffer = async (categoryId) => {
    if (!categoryId) throw new Error("Category ID is required");

    const resetPayload = { 
        "offer.discountValue": 0, 
        "offer.isActive": false,
        "offer.startDate": null,
        "offer.expiryDate": null
    };
    
    return await OfferRepo.updateCategoryOffer(categoryId, resetPayload);
};