
import * as cartService from '../services/cartService.js';

export const loadCart = async (req, res) => {
    try {

        const userId = req.session.user.id;

        const cartData =
            await cartService.getCartPageData(userId);

        
        res.render('user/cart', cartData);

    } catch (error) {

        console.log(error);

        res.send(error.message);
    }
};

export const addToCart = async (req, res) => {
    try {

        const userId = req.session.user?.id;
        console.log("user",userId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login first"
            });
        }

        const result = await cartService.addToCart(userId, req.body);

        return res.json({
            success: true,
            message: "Added to cart",
            cart: result
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const { productId, size, color, targetQuantity } = req.body;

        const cart = await cartService.updateQuantity(userId, {
            productId,
            size,
            color,
            targetQuantity
        });

        res.json({
            success: true,
            ...cart
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
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

        return res.json({ success: true, message: "Removed from cart", cart: result });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message });
    }
};