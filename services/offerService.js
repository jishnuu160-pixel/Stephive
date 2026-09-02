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

    const subCategories = allCategories.filter(category =>
            category.parentCategory !== null &&
            category.parentCategory !== undefined
    );

 
const productOffers = [];

allProducts.forEach(product => {
    const offers = Array.isArray(product.offer)
        ? product.offer
        : product.offer
            ? [product.offer]
            : [];

    offers.forEach(offer => {
        if (!offer || !offer.isActive) return;

        productOffers.push({
            ...product,
            offer
        });
    });
});

const categoryOffers = [];

allCategories.forEach(category => {
    const offers = Array.isArray(category.offer)
        ? category.offer
        : category.offer
            ? [category.offer]
            : [];

    offers.forEach(offer => {
        if (!offer) return;

        categoryOffers.push({
            ...category,
            offer
        });
    });
});

    return {allProducts,
            allCategories,
            subCategories,
            productOffers,
            categoryOffers
    };
};

export const applyProductOffer = async (productId,discountValue,startDate,expiryDate) => {

    if (!productId) {
        throw new Error("Please select a target product.");
    }

    if (!discountValue) {
        throw new Error("Please enter a discount value.");
    }

    if (!startDate) {
        throw new Error("Please select a start date.");
    }

    if (!expiryDate) {
        throw new Error("Please select an expiry date.");
    }

    const numericDiscount = Number(discountValue);

    if (
        isNaN(numericDiscount) ||
        numericDiscount <= 0 ||
        numericDiscount > 99
    ) {
        throw new Error(
            "Discount percentage must be between 1 and 99."
        );
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

    const minimumExpiry = new Date(start);
    minimumExpiry.setDate(minimumExpiry.getDate() + 2);

    if (expiry < minimumExpiry) {
        throw new Error(
            "Expiry date must be at least 2 days after the start date."
        );
    }

    const product = await OfferRepo.findProductById(productId);

    if (!product) {
        throw new Error("Product not found.");
    }

    const existingOffers = Array.isArray(product.offer)
        ? product.offer
        : product.offer
            ? [product.offer]
            : [];

    const remainingOffers = existingOffers.filter(existingOffer => {

        if (!existingOffer || !existingOffer.startDate || !existingOffer.expiryDate){
            return true;
        }

        const existingStart = new Date(existingOffer.startDate);
        existingStart.setHours(0, 0, 0, 0);

        const existingExpiry = new Date(existingOffer.expiryDate);
        existingExpiry.setHours(0, 0, 0, 0);

        const hasOverlap = existingStart <= expiry && existingExpiry >= start;

        return !hasOverlap;
    });

    const offerData = {
        discountValue: numericDiscount,
        isActive: true,
        offerType: "Percentage",
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate)
    };

    const updatedOffers = [
        ...remainingOffers,
        offerData
    ];

    return await OfferRepo.replaceProductOffers(
        productId,
        updatedOffers
    );
};

export const applyCategoryOffer = async (
    subCategoryName,
    parentCategories,
    discountValue,
    startDate,
    expiryDate
) => {
    if (!subCategoryName) {
        throw new Error("Please select a target subcategory.");
    }

    if (!discountValue) {
        throw new Error("Please enter a discount rate.");
    }

    if (!startDate) {
        throw new Error("Please select a start date.");
    }

    if (!expiryDate) {
        throw new Error("Please select an expiry date.");
    }

    const numericDiscount = Number(discountValue);

    if (
        isNaN(numericDiscount) ||
        numericDiscount <= 0 ||
        numericDiscount > 99
    ) {
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

    const minimumExpiry = new Date(start);
    minimumExpiry.setDate(minimumExpiry.getDate() + 2);

    if (expiry < minimumExpiry) {
        throw new Error(
            "Expiry date must be at least 2 days after the start date."
        );
    }

    const parentsArray = Array.isArray(parentCategories)
        ? parentCategories
        : [parentCategories].filter(Boolean);

    if (parentsArray.length === 0) {
        throw new Error(
            "Please select at least one parent department."
        );
    }

    const parentDocs = await OfferRepo.findParentsByName(parentsArray);

    const parentIds = parentDocs.map(doc => doc._id);

    if (parentIds.length === 0) {
        throw new Error(
            "Could not find matching parent departments in the database."
        );
    }

    const targetSubCategories =
        await OfferRepo.findSubCategoriesByParentIds(
            subCategoryName,
            parentIds
        );

    if (targetSubCategories.length === 0) {
        throw new Error(
            "No matching subcategories found under the selected departments."
        );
    }

    const offerData = {
        discountValue: numericDiscount,
        isActive: true,
        offerType: "Percentage",
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate)
    };

    for (const category of targetSubCategories) {

        const existingOffers = Array.isArray(category.offer)
            ? category.offer
            : category.offer
                ? [category.offer]
                : [];

        const remainingOffers = existingOffers.filter(existingOffer => {

            if (
                !existingOffer ||
                !existingOffer.startDate ||
                !existingOffer.expiryDate
            ) {
                return true;
            }

            const existingStart = new Date(existingOffer.startDate);
            existingStart.setHours(0, 0, 0, 0);

            const existingExpiry = new Date(existingOffer.expiryDate);
            existingExpiry.setHours(0, 0, 0, 0);

            const hasOverlap =
                existingStart <= expiry &&
                existingExpiry >= start;

            return !hasOverlap;
        });

        const updatedOffers = [
            ...remainingOffers,
            offerData
        ];

        await OfferRepo.replaceCategoryOffers(
            category._id,
            updatedOffers
        );
    }

    return true;
};

export const removeProductOffer = async (productId, offerId) => {
    if (!productId) {
        throw new Error("Product ID is required");
    }

    if (!offerId) {
        throw new Error("Offer ID is required");
    }

    return await OfferRepo.removeProductOffer(productId, offerId);
};

export const removeCategoryOffer = async (categoryId, offerId) => {
    if (!categoryId) {
        throw new Error("Category ID is required");
    }

    if (!offerId) {
        throw new Error("Offer ID is required");
    }

    return await OfferRepo.removeCategoryOffer(categoryId, offerId);
};