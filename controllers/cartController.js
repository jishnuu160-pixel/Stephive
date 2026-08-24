import * as cartService from '../services/cartService.js';
import * as wishlistService from '../services/wishlistService.js';
import { HTTP_STATUS } from '../constants/httpStatusCode.js';

export const loadCart = async (req, res) => {
    try {
       const userId = req.user?._id || req.session?.user?.id;
        const page=parseInt(req.query.page)||1;
        const cartData = await cartService.getCartPageData(userId,page);

        res.render('user/cart', {...cartData});  

    } catch (error) {
        console.error("Error Load Cart:",error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(error.message);
    }
};

export const addToCart = async (req, res) => {
    try {
        const userId = req.user?._id || req.session?.user?.id;
        const { productId, variantId, size, quantity } = req.body;

        if (!productId || !variantId || !size) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Missing required product details" });
        }

        const result = await cartService.addToCart(userId, req.body);
        
        await wishlistService.removeFromWishlist(userId, productId, variantId, size);
        
        return res.status(HTTP_STATUS.OK).json({ success: true, message: "Added to cart", cart: result });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, size, color, targetQuantity } = req.body;

        const cartMetrics = await cartService.updateQuantity(userId, {
            productId,
            size,
            color,
            targetQuantity
        });
        res.status(HTTP_STATUS.OK).json({
            success: true,
            ...cartMetrics 
        });

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, size, color } = req.body;

        const result = await cartService.removeFromCart(userId, {
            productId,
            size,
            color
        });

        return res.status(HTTP_STATUS.OK).json({ 
            success: true, 
            message: "Removed from cart", 
            ...result 
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};