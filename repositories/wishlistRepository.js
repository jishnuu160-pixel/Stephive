import Wishlist from "../models/wishlistModel.js";

export const findByUserId = async (userId) => {
    return await Wishlist.findOne({ user_id: userId })
        .populate("items.productId")
        .lean();
};

export const createWishlist = async (userId) => {
    return await Wishlist.create({
        user_id: userId,
        items: []
    });
};

export const toggleWishlist = async (userId, productId, variantId, size) => {
    const wishlist = await Wishlist.findOne({ user_id: userId });

    if (!wishlist) {
        return await Wishlist.create({
            user_id: userId,
            items: [{ productId, variantId, size }]
        });
    }

    const exists = wishlist.items.some(item => 
        item.productId && item.productId.toString() === productId &&
        item.variantId && item.variantId.toString() === variantId &&
        item.size === size
    );

    if (exists) {
        return await Wishlist.findOneAndUpdate(
            { user_id: userId },
            { $pull: { items: { productId, variantId, size } } },
            { new: true }
        );
    } else {
        return await Wishlist.findOneAndUpdate(
            { user_id: userId },
            { $addToSet: { items: { productId, variantId, size } } },
            { new: true }
        );
    }
};

export const isInWishlist = async (userId, productId, variantId, size) => {
    const wishlist = await Wishlist.findOne({
        user_id: userId,
        items: {
            $elemMatch: {
                productId: productId,
                variantId: variantId,
                size: size
            }
        }
    });

    return !!wishlist;
};

export const findWishlistCount = async (userId) => {
    const wishlist = await Wishlist.findOne({ user_id: userId });
    return wishlist ? wishlist.items.length : 0;
};

export const removeFromWishlist = async (userId, productId, variantId, size) => {
    return await Wishlist.findOneAndUpdate(
        { user_id: userId },
        { $pull: { items: { productId, variantId, size } } },
        { new: true } 
    );
};