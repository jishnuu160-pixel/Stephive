import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js'; 
import mongoose from 'mongoose';

const MAX_QUANTITY_PER_ITEM = 5;

export const addToCart = async (req, res) => {
    try {
        const { productId, variantId, size, color, quantity = 1 } = req.body;
       
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Please log in to add items to your cart." });
        }

        const userId = req.session.user._id || req.session.user.id;
        const requestedQty = parseInt(quantity) || 1;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        if (!product.isListed || product.isBlocked) {
            return res.status(403).json({ success: false, message: "This item is currently unavailable for purchase." });
        }

        if (product.stock <= 0) {
            return res.status(400).json({ success: false, message: "This shoe is completely out of stock." });
        }

        const activePrice = product.salePrice ? product.salePrice : product.regularPrice;

        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            cart = new Cart({ 
                userId: userId, 
                items: [], 
                totalAmount: 0 
            });
        }

        const existingItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && 
            item.size === size && 
            item.color === color
        );

        if (existingItemIndex > -1) {
            const updatedQty = cart.items[existingItemIndex].quantity + requestedQty;

            if (updatedQty > product.stock) {
                return res.status(400).json({ success: false, message: `Cannot add more. Only ${product.stock} pairs available.` });
            }

            if (updatedQty > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({ success: false, message: `Purchasing cap threshold is ${MAX_QUANTITY_PER_ITEM} units per shoe.` });
            }

            cart.items[existingItemIndex].quantity = updatedQty;
        } else {
            if (requestedQty > product.stock) {
                return res.status(400).json({ success: false, message: `Only ${product.stock} units remaining.` });
            }
            if (requestedQty > MAX_QUANTITY_PER_ITEM) {
                return res.status(400).json({ success: false, message: `Purchasing cap threshold is ${MAX_QUANTITY_PER_ITEM} units.` });
            }

            cart.items.push({
                productId,
                variantId,
                size,
                color,
                quantity: requestedQty,
                price: activePrice
            });
        }

        let subtotal = 0;
        cart.items.forEach(item => {
            subtotal += (parseFloat(item.price || 0) * item.quantity);
        });

        cart.totalAmount = Math.round(subtotal * 1.10); 

        await cart.save();
        
        if (User) {
            await User.findByIdAndUpdate(userId, {
                $pull: { wishlist: productId }
            });
        }

        return res.status(200).json({ success: true, message: "Item successfully added to your cart!" });

    } catch (error) {
        console.error("❌ Add to cart system exception:", error);
        return res.status(500).json({ 
            success: false, 
            message: `Internal server failure: ${error.message}` 
        });
    }
};


export const getCartPage = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/login');

        const userId = req.session.user._id || req.session.user.id;

        const cartData = await Cart.findOne({ userId: userId })
            .populate('items.productId')
            .lean();
        
        if (!cartData || !cartData.items || !cartData.items.length) {
            return res.render('user/cart', { 
                cart: { items: [] }, 
                totalUnitsCount: 0, 
                hasCheckoutRestrictions: false 
            });
        }

        let totalUnitsCount = 0;
        let runningSubtotal = 0;
        let hasCheckoutRestrictions = false; 
       
        const validatedItems = cartData.items.map(item => {
            const product = item.productId;
            
            const productStock = product && typeof product.stock !== 'undefined' ? product.stock : 10;
            const productIsListed = product && typeof product.isListed !== 'undefined' ? product.isListed : true;
            const productIsBlocked = product && typeof product.isBlocked !== 'undefined' ? product.isBlocked : false;

            const isOutOfStock = !product || productStock <= 0;
            const isUnlisted = !product || !productIsListed || productIsBlocked; 
            const hasInsufficientStock = product && item.quantity > productStock; 

            if (isOutOfStock || isUnlisted || hasInsufficientStock) {
                hasCheckoutRestrictions = true;
            }

            const livePrice = product ? (product.salePrice || product.regularPrice) : (item.price || 0);
            const itemLineSubtotal = livePrice * item.quantity;

            totalUnitsCount += item.quantity;
            runningSubtotal += itemLineSubtotal;

            return {
                ...item,
                productId: product || { _id: item.productId, productName: 'StepHive Premium Shoe', regularPrice: item.price }, 
                itemSubtotal: itemLineSubtotal,
                price: livePrice,
                isOutOfStock,
                isUnlisted,
                hasInsufficientStock,
                maxStockLimit: productStock
            };
        });

        const salesTaxEstimate = Math.round(runningSubtotal * 0.10); 
        const combinedGrandTotal = runningSubtotal + salesTaxEstimate;

        res.render('user/cart', {
            totalUnitsCount,
            hasCheckoutRestrictions,
            cart: {
                items: validatedItems,
                subtotal: runningSubtotal,
                taxEstimate: salesTaxEstimate,
                totalAmount: combinedGrandTotal
            }
        });

    } catch (error) {
        console.error("List cart controller system failure:", error);
        res.status(500).send("Critical error compiling your cart workspace.");
    }
};

export const removeProduct = async (req, res) => {
    try {
        const { productId, size, color } = req.body;
        const userId = req.session.user._id || req.session.user.id;

        await Cart.findOneAndUpdate(
            { userId: userId },
            { $pull: { items: { productId, size, color } } },
            { new: true }
        );

        return res.status(200).json({ success: true, message: "Item row dropped smoothly from user cart array." });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Unable to process item disposal request." });
    }
};


export const updateQuantityInline = async (req, res) => {
    try {
        const { productId, size, color, targetQuantity } = req.body;
        const userId = req.session.user._id || req.session.user.id;
        const finalQty = parseInt(targetQuantity);

        if (finalQty < 1) {
            return res.status(400).json({ success: false, message: "Minimum selection parameter limit is 1 pair." });
        }
        if (finalQty > MAX_QUANTITY_PER_ITEM) {
            return res.status(400).json({ success: false, message: `Purchasing cap threshold is ${MAX_QUANTITY_PER_ITEM} units.` });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isListed || product.isBlocked) {
            return res.status(400).json({ success: false, message: "Item no longer accessible." });
        }

        if (finalQty > product.stock) {
            return res.status(400).json({ success: false, message: `Only ${product.stock} units remaining.` });
        }

        const cart = await Cart.findOne({ userId: userId });
        const targetIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId && item.size === size && item.color === color
        );

        if (targetIndex === -1) {
            return res.status(404).json({ success: false, message: "Requested item layout row absent." });
        }

        cart.items[targetIndex].quantity = finalQty;
        await cart.save();

        const updatedCart = await Cart.findOne({ userId: userId }).populate('items.productId').lean();
        let freshSubtotal = 0;

        updatedCart.items.forEach(item => {
            const p = item.productId;
            if (p && p.isListed && !p.isBlocked && p.stock >= item.quantity) {
                freshSubtotal += (p.salePrice || p.regularPrice) * item.quantity;
            }
        });

        const freshTax = Math.round(freshSubtotal * 0.10);

        return res.status(200).json({
            success: true,
            subtotal: freshSubtotal,
            taxEstimate: freshTax,
            totalAmount: freshSubtotal + freshTax
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Inline count sync error execution failure." });
    }
};