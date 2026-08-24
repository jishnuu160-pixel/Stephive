import * as wishlistRepo from "../repositories/wishlistRepository.js";

export const getWishlist = async (userId) => {
    if (!userId) {
        console.warn("⚠️ getWishlist called with undefined userId. Skipping creation.");
        return { items: [] }; 
    }

    let wishlist = await wishlistRepo.findByUserId(userId);
    
    if (!wishlist) {
        wishlist = await wishlistRepo.createWishlist(userId);
        if (wishlist && typeof wishlist.toObject === 'function') {
            wishlist = wishlist.toObject();
        }
    }
    return wishlist;
};

export const toggleWishlist = async (userId, productId, variantId, size) => {
    return await wishlistRepo.toggleWishlist(userId, productId, variantId, size);
};

export const isInWishlist = async (userId, productId, variantId, size) => {
    return await wishlistRepo.isInWishlist(userId, productId, variantId, size);
};

export const getWishlistCount = async (userId) => {
    return await wishlistRepo.findWishlistCount(userId);
}

export const removeFromWishlist = async (userId, productId, variantId, size) => {
    return await wishlistRepo.removeFromWishlist(userId, productId, variantId, size);
};