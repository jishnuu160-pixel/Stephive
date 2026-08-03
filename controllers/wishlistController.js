import * as wishlistService from "../services/wishlistService.js";
import { HTTP_STATUS } from '../constants/httpStatusCode.js';

export const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const wishlist = await wishlistService.getWishlist(userId);
        
        res.render("user/wishlist", {
            wishlist,
            activePage: "wishlist"
        });
    } catch (err) {
        console.error(err);
        res.redirect("/");
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, size } = req.body;

        if (!productId || !variantId || !size) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Missing required fields (productId, variantId, size)" });
        }

        const updatedWishlist = await wishlistService.toggleWishlist(userId, productId, variantId, size);

        const newCount = updatedWishlist.items ? updatedWishlist.items.length : 0;

        const isWishlisted = await wishlistService.isInWishlist(userId, productId, variantId, size);

        return res.json({
            success: true,
            isWishlisted, 
            newCount
        });
    } catch (err) {
        console.error("Error toggling wishlist:", err);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};

export const getWishlistCount = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const count = await wishlistService.getWishlistCount(userId);
       
        return res.json({
            success: true,
            count
        });
    } catch {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false
        });
    }
};

export const checkWishlistStatus = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, size } = req.query;

        if (!productId || !variantId || !size) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Missing parameters" });
        }

        const isInWishlist = await wishlistService.isInWishlist(userId, productId, variantId, size);

        return res.json({
            success: true,
            isInWishlist
        });
    } catch (err) {
        console.error("Error checking wishlist status:", err);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
    }
};