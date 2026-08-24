import * as cartRepo from '../repositories/cartRepository.js';
import * as productRepo from '../repositories/productRepository.js';
import { attachOfferPricing } from './productService.js';


const getBestProductPrice = async (productDoc) => {
    if (!productDoc) return 0;
    const enrichedProduct = await attachOfferPricing(productDoc);
    return enrichedProduct.salePrice;
};

const calculateCartTotals = (items) => {
    const totalUnitsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    
    const subtotal = items.reduce((sum, item) => {
        const priceToUse = Number(item.currentPrice) !== undefined && !isNaN(Number(item.currentPrice)) 
            ? Number(item.currentPrice) 
            : (Number(item.price) || 0);
            
        return sum + (priceToUse * (Number(item.quantity) || 0));
    }, 0);

    const taxEstimate = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + taxEstimate;
    
    return { subtotal, taxEstimate, totalAmount, totalUnitsCount };
};

const getProductIdString = (item) => {
    if (!item.productId) return '';
    return item.productId._id ? item.productId._id.toString() : item.productId.toString();
};

export const getCartPageData = async (userId, page) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) return { cart: { items: [] }, totalUnitsCount: 0, subtotal: 0, totalAmount: 0, hasCheckoutRestrictions: false };

    let hasCheckoutRestrictions = false;
    let cartModified = false;
    let adjustmentNotice = null;

    const processedItems = await Promise.all(cart.items.map(async (item) => {
        let isOutOfStock = false;
        let hasInsufficientStock = false;
        let isUnlisted = false;
        let availableStock = 0; 
        let sizeDetails = null; 
        
        let currentPrice = Number(item.price) || 0;
        const productDoc = item.productId; 

        if (productDoc) {
            isUnlisted = productDoc.isListed === false;
            
            currentPrice = await getBestProductPrice(productDoc);

            const targetVariant = productDoc.variants?.find(v => v._id.toString() === item.variantId?.toString());
            sizeDetails = targetVariant?.sizes?.find(s => s.size.toString() === item.size.toString());

            if (sizeDetails) {
                availableStock = sizeDetails.stock;
                isOutOfStock = availableStock <= 0;

                if (item.quantity > availableStock && availableStock > 0) {
                    item.quantity = availableStock; 
                    cartModified = true;
                }

                hasInsufficientStock = item.quantity > availableStock;
            } else {
                isOutOfStock = true; 
            }
        } else {
            isUnlisted = true; 
        }

        if (hasInsufficientStock || isOutOfStock || isUnlisted) hasCheckoutRestrictions = true;
        
        const itemSubtotal = item.quantity * currentPrice;
        
        return { 
            ...item, 
            currentPrice, 
            itemSubtotal, 
            isOutOfStock, 
            hasInsufficientStock, 
            isUnlisted, 
            availableStock 
        };
    }));

    cart.items = processedItems.reverse();

    if (cartModified) {
        const itemsToSave = cart.items
            .filter(i => i && i.productId)
            .map(i => ({
                productId: i.productId._id || i.productId,
                variantId: i.variantId,
                size: i.size,
                quantity: Number(i.quantity) || 1,
                price: Number(i.currentPrice || i.price) || 0
            }));

        await cartRepo.updateCart(userId, { items: itemsToSave });
        adjustmentNotice = "Some item quantities in your cart were automatically adjusted due to limited stock availability.";
    }

    const validCartItemsForTotals = cart.items.filter(item => 
        !item.isOutOfStock && !item.hasInsufficientStock && !item.isUnlisted
    );

    hasCheckoutRestrictions = (cart.items.length === 0 || validCartItemsForTotals.length === 0);

    const totals = calculateCartTotals(validCartItemsForTotals);
    const limit = 4;
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(cart.items.length / limit);
    const paginatedItems = cart.items.slice(skip, skip + limit);

    return { 
        cart: { ...cart, subtotal: totals.subtotal, totalAmount: totals.totalAmount, taxEstimate: totals.taxEstimate, items: paginatedItems },
        totalUnitsCount: totals.totalUnitsCount,
        hasCheckoutRestrictions,
        adjustmentNotice,
        currentPage: page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages
    };
};   

export const addToCart = async (userId, itemData) => {
    const product = await productRepo.findProductById(itemData.productId);
    
    if (!product) throw new Error("Product not found");

    const targetVariant = product.variants.find(v => v._id.toString() === itemData.variantId.toString());
    const sizeDetails = targetVariant?.sizes.find(s => s.size.toString() === itemData.size.toString());
    
    if (!sizeDetails || sizeDetails.stock <= 0) throw new Error("Out of Stock.");
    
    let cart = await cartRepo.findCartByUserId(userId);
    if (!cart) {
        cart = { userId: userId, items: [] };
    }

    const resolvedPrice = await getBestProductPrice(product);

    const existingItem = cart.items.find(i => {
        const iPid = (i.productId?._id ? i.productId._id : i.productId)?.toString();
        const dPid = itemData.productId.toString();
        
        const iVid = i.variantId?.toString() || "";
        const dVid = itemData.variantId?.toString() || "";
        
        const iSize = i.size?.toString().trim() || "";
        const dSize = itemData.size?.toString().trim() || "";

        return iPid === dPid && iVid === dVid && iSize === dSize;
    });

    const newAdditionQty = Number(itemData.quantity) || 1;
    const currentCartQty = existingItem ? existingItem.quantity : 0;
    const combinedTotalQty = currentCartQty + newAdditionQty;

    if (combinedTotalQty > 5) {
        throw new Error("You can only add a maximum of 5 units per item to your cart.");
    }

    if (combinedTotalQty > sizeDetails.stock) {
        if (currentCartQty > 0) {
            throw new Error(`Cannot add more. You already have ${currentCartQty} units in your cart, and only ${sizeDetails.stock} are available in stock.`);
        } else {
            throw new Error(`Requested quantity exceeds available inventory. Only ${sizeDetails.stock} units are in stock.`);
        }
    }

    if (existingItem) {
        existingItem.quantity = combinedTotalQty;
        existingItem.color = targetVariant.colorName;
        existingItem.price = resolvedPrice;
    } else {
        cart.items.push({ 
            productId: itemData.productId, 
            variantId: itemData.variantId,
            size: itemData.size.toString(),
            color: targetVariant.colorName,
            quantity: newAdditionQty,
            price: resolvedPrice 
        });
    }

    return await cartRepo.updateCart(userId, { items: cart.items });
};

export const updateQuantity = async (userId, data) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) throw new Error("Cart not found");

    if (!data.productId || !data.size) {
        throw new Error("Invalid update request: Missing Product ID or Size.");
    }
    const item = cart.items.find(i => {
        const itemPid = i.productId?._id ? i.productId._id.toString() : i.productId?.toString();
        const matchPid = itemPid === data.productId.toString();

        const matchSize = i.size?.toString().trim() === data.size.toString().trim();

        let matchVariant = true;
        if (data.variantId) {
            matchVariant = i.variantId?.toString() === data.variantId.toString();
        }

        let matchColor = true;
        if (data.color) {
            matchColor = (i.color || 'default').toString().toLowerCase() === data.color.toString().toLowerCase();
        }
        return matchPid && matchSize && matchVariant && matchColor;
    });
    if (!item) throw new Error("Cart item not found");
    
    const product = await productRepo.findProductById(data.productId);
    if (product) {
        const itemVid = i => i.variantId?._id ? i.variantId._id.toString() : i.variantId?.toString();
        const targetVariant = product.variants.find(v => v._id.toString() === itemVid(item));
        const sizeDetails = targetVariant?.sizes.find(s => s.size.toString() === item.size.toString());
        
        if (sizeDetails && Number(data.targetQuantity) > sizeDetails.stock) {
            throw new Error(`Only ${sizeDetails.stock} units are currently available in stock.`);
        }
    }
    item.quantity = Number(data.targetQuantity);
    
    await cartRepo.updateCart(userId, { items: cart.items });
    return calculateCartTotals(cart.items);
};

export const removeFromCart = async (userId, itemData) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) return { totalUnitsCount: 0 };

    cart.items = cart.items.filter(cartItem => {
        const existingProductId = (cartItem.productId?._id ? cartItem.productId._id : cartItem.productId)?.toString();
        const requestedProductId = itemData.productId.toString();

        const existingSize = cartItem.size?.toString().trim();
        const requestedSize = itemData.size?.toString().trim();

        const isMatch = existingProductId === requestedProductId && existingSize === requestedSize;
        
        return !isMatch; 
    });

    await cartRepo.updateCart(userId, { items: cart.items });
    return { success: true, ...calculateCartTotals(cart.items) };
};


export const transferFromWishlist = async (userId, itemData) => {
    const product = await productRepo.findProductById(itemData.productId);
    
    const cartItem = {
        productId: product._id,
        variantId: itemData.variantId,
        size: itemData.size.toString(), 
        color: itemData.color.toString(), 
        quantity: 1,
        price: product.salePrice || product.regularPrice
    };

    await addToCart(userId, cartItem);
    await wishlistService.removeFromWishlist(userId, itemData.productId);
};