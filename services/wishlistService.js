import * as wishlistRepo from "../repositories/wishlistRepository.js";

export const getWishlist = async (userId) => {
    let wishlist = await wishlistRepo.findByUserId(userId);
    
    if (!wishlist) {
        wishlist = await wishlistRepo.createWishlist(userId);
        wishlist = wishlist.toObject();
    }
    return wishlist;
};

export const toggleWishlist=async(userId,productId)=>{
    
    return await wishlistRepo.toggleWishlist(userId,productId);
};

export const isInWishlist = async (userId, productId) => {

    return await wishlistRepo.isInWishlist(userId, productId);
};

export const getWishlistCount= async(userId)=>{

    return await wishlistRepo.findWishlistCount(userId);
}

export const removeFromWishlist = async (userId, productId) => {
    return await wishlistRepo.removeFromWishlist(userId, productId);
};