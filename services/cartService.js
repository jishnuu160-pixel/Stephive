import * as cartRepo from '../repositories/cartRepository.js';
import Product from '../models/productModel.js';

export const addToCart = async (userId, itemData) => {

    const product = await Product.findById(itemData.productId);

    if (!product) {
        throw new Error("Product not found");
    }

    const price = product.salePrice || product.regularPrice;

    const cartItem = {
        productId: itemData.productId,
        variantId: itemData.variantId,
        size: itemData.size,
        color: itemData.color,
        quantity: itemData.quantity || 1,
        price: price   
    };
    console.log(itemData);

    let cart = await cartRepo.findCartByUserId(userId);

    if (!cart) {
        return await cartRepo.createCart({
            userId,
            items: [cartItem]
        });
    }

   const existingIndex = cart.items.findIndex(item =>
    item.productId._id.toString() === itemData.productId &&
    item.size === itemData.size &&
    item.color === itemData.color
);

    if (existingIndex > -1) {
        cart.items[existingIndex].quantity += cartItem.quantity;
    } else {
        cart.items.push(cartItem);
    }
    console.log("ADDING CART USER ID:", userId);//added
    console.log("CART ITEMS:", cart.items);

    await cartRepo.updateCart(userId, {
    items: cart.items
});

    return cart;
};


export const getCartPageData = async (userId) => {

    const cart = await cartRepo.findCartByUserId(userId);
    console.log("FETCHING CART USER ID:", userId);//addede

    if (!cart) {
        return {
            cart: { items: [] },
            totalUnitsCount: 0,
            hasCheckoutRestrictions: false
        };
    }

    let subtotal = 0;
    let totalUnitsCount = 0;
    let hasCheckoutRestrictions = false;

    cart.items = cart.items.map(item => {

        const itemSubtotal = item.quantity * item.price; 

        subtotal += itemSubtotal;
        totalUnitsCount += item.quantity;

        const isOutOfStock = false; 
        const hasInsufficientStock = item.quantity > 5; 
        const isUnlisted = false;

        if (hasInsufficientStock) {
            hasCheckoutRestrictions = true;
        }

        return {
            ...item,
            itemSubtotal,
            isOutOfStock,
            hasInsufficientStock,
            isUnlisted
        };
    });

    const taxEstimate = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + taxEstimate;

    cart.subtotal = subtotal;
    cart.taxEstimate = taxEstimate;
    cart.totalAmount = totalAmount;

    return {
        cart,
        totalUnitsCount,
        hasCheckoutRestrictions
    };
};


export const removeFromCart = async (userId, itemData) => {

    const cart = await cartRepo.findCartByUserId(userId);

    if (!cart) return null;

    cart.items = cart.items.filter(item =>
        !(
            item.productId._id.toString() === itemData.productId &&
            item.size === itemData.size &&
            item.color === itemData.color
        )
    );
    console.log("CART ITEMS:", cart.items);

    await cartRepo.updateCart(userId, {
    items: cart.items
});

    return cart;
};

export const updateQuantity = async (userId, data) => {

    const cart = await cartRepo.findCartByUserId(userId);

    if (!cart) {
        throw new Error("Cart not found");
    }

    const item = cart.items.find(i =>
        i.productId._id.toString() === data.productId &&
        i.size === data.size &&
        i.color === data.color
    );

    if (!item) {
        throw new Error("Cart item not found");
    }

    item.quantity = Number(data.targetQuantity);

    await cartRepo.updateCart(userId, {
        items: cart.items
    });

    let subtotal = 0;

    cart.items.forEach(item => {
        subtotal += item.price * item.quantity;
    });

    const taxEstimate = Math.floor(subtotal * 0.1);

    const totalAmount = subtotal + taxEstimate;

    return {
        subtotal,
        taxEstimate,
        totalAmount
    };
};