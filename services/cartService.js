import * as cartRepo from '../repositories/cartRepository.js';
import * as productRepo from '../repositories/productRepository.js';

const calculateCartTotals = (items) => {
    const totalUnitsCount =items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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

    cart.items = cart.items.map(item => {
        let isOutOfStock = false;
        let hasInsufficientStock = false;
        let isUnlisted = false;
        let availableStock = 0; 
        let sizeDetails = null; 

        const productDoc = item.productId; 
        if (productDoc) {
            isUnlisted = productDoc.isListed === false;
            const targetVariant = productDoc.variants?.find(v => v._id.toString() === item.variantId?.toString());
            
            sizeDetails = targetVariant?.sizes?.find(s => s.size.toString() === item.size.toString());

            if (sizeDetails) {
                availableStock = sizeDetails.stock;
                isOutOfStock = availableStock <= 0;
                hasInsufficientStock = item.quantity > availableStock;
            } else {
                isOutOfStock = true; 
            }
        } else {
            isUnlisted = true; 
        }

        if (hasInsufficientStock || isOutOfStock || isUnlisted) hasCheckoutRestrictions = true;
        
        const itemSubtotal = item.quantity * item.price;
      
        
        return { 
            ...item, 
           
            itemSubtotal, 
            isOutOfStock, 
            hasInsufficientStock, 
            isUnlisted, 
            availableStock 
        };
    });

    const totals = calculateCartTotals(cart.items);
    
    return { 
        cart: { ...cart, subtotal: totals.subtotal, totalAmount:totals.totalAmount, taxEstimate: totals.taxEstimate },
        totalUnitsCount: totals.totalUnitsCount,
        hasCheckoutRestrictions
    };
};

export const addToCart = async (userId, itemData) => {
    const product = await productRepo.findProductById(itemData.productId);
    if (!product) throw new Error("Product not found");

    const targetVariant = product.variants.find(v => v._id.toString() === itemData.variantId.toString());
    const sizeDetails = targetVariant?.sizes.find(s => s.size.toString() === itemData.size.toString());
    
    if (!sizeDetails || sizeDetails.stock <= 0) throw new Error("This size is currently Out of Stock.");
    
    const requestedQty = Number(itemData.quantity) || 1;
    let cart = await cartRepo.findCartByUserId(userId) || { items: [] };

    const existingItem = cart.items.find(i => getProductIdString(i) === itemData.productId && i.size === itemData.size && i.color === itemData.color);

    if (existingItem) {
        const combinedQty = existingItem.quantity + requestedQty;
        if (combinedQty > 5 || combinedQty > sizeDetails.stock) throw new Error("Quantity exceeds stock or limit.");
        existingItem.quantity = combinedQty;
    } else {
        if (requestedQty > sizeDetails.stock) throw new Error("Insufficient stock.");
        cart.items.push({ ...itemData, price: product.salePrice || product.regularPrice, quantity: requestedQty });
    }

    return await cartRepo.updateCart(userId, { items: cart.items });
};

export const updateQuantity = async (userId, data) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) throw new Error("Cart not found");

    const item = cart.items.find(i => getProductIdString(i) === data.productId && i.size === data.size && i.color === data.color);
    if (!item) throw new Error("Cart item not found");

    const product = await productRepo.findProductById(data.productId);
    const variant = product?.variants.find(v => v._id.toString() === item.variantId.toString());
    const sizeDetails = variant?.sizes.find(s => s.size.toString() === item.size.toString());

    if (!sizeDetails) throw new Error("Product variant is no longer available.");

   const requestedQty = Number(data.targetQuantity);
const currentQty = item.quantity;

if (requestedQty < 1) {
    throw new Error("Quantity must be at least 1.");
}

if (requestedQty > 5) {
    throw new Error("Maximum limit is 5 units per item.");
}

if (
    requestedQty > currentQty &&
    requestedQty > sizeDetails.stock
) {
    throw new Error(`Only ${sizeDetails.stock} items available.`);
}
    item.quantity = requestedQty;
    await cartRepo.updateCart(userId, { items: cart.items });

    return calculateCartTotals(cart.items);
};

export const removeFromCart = async (userId, itemData) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) return { totalUnitsCount: 0 };

    cart.items = cart.items.filter(i => !(getProductIdString(i) === itemData.productId && i.size === itemData.size && i.color === itemData.color));
    await cartRepo.updateCart(userId, { items: cart.items });

    return { success: true, ...calculateCartTotals(cart.items) };
};

