import * as cartRepo from '../repositories/cartRepository.js';
import * as productRepo from '../repositories/productRepository.js';

export const getCartPageData = async (userId) => {
    const cart = await cartRepo.findCartByUserId(userId);

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

    const getProductIdString = (item) => {
        if (!item.productId) return '';
        return item.productId._id ? item.productId._id.toString() : item.productId.toString();
    };

    cart.items = cart.items.map(item => {
        const itemSubtotal = item.quantity * item.price; 

        subtotal += itemSubtotal;
        totalUnitsCount += item.quantity;

        let isOutOfStock = false; 
        let hasInsufficientStock = item.quantity > 5; 
        let isUnlisted = false;

        const productDoc = item.productId; 
        if (productDoc) {
            isUnlisted = productDoc.isListed === false;

            const targetVariant = productDoc.variants?.find(v => 
                v._id.toString() === item.variantId?.toString()
            );

            if (targetVariant) {
                const sizeDetails = targetVariant.sizes?.find(s => 
                    s.size.toString() === item.size.toString()
                );

                if (sizeDetails) {
                    isOutOfStock = sizeDetails.stock <= 0;
                    
                    if (item.quantity > sizeDetails.stock) {
                        hasInsufficientStock = true;
                    }
                } else {
                    isOutOfStock = true; 
                }
            } else {
                isOutOfStock = true; 
            }
        }

        if (hasInsufficientStock || isOutOfStock || isUnlisted) {
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

export const addToCart = async (userId, itemData) => {
    const product = await productRepo.findProductById(itemData.productId);

    if (!product) {
        throw new Error("Product not found");
    }

    const requestedQty = Number(itemData.quantity) || 1;
    
    if (requestedQty > 5) {
        throw new Error("Maximum allowable limit per item is 5 units.");
    }

    const targetVariant = product.variants.find(v => v._id.toString() === itemData.variantId.toString());
    if (!targetVariant) {
        throw new Error("Selected product variant color layout not found.");
    }

    const sizeDetails = targetVariant.sizes.find(s => s.size.toString() === itemData.size.toString());
    if (!sizeDetails) {
        throw new Error("Selected size option is unavailable.");
    }

    if (sizeDetails.stock <= 0) {
        throw new Error("This size is currently Out of Stock.");
    }

    const price = product.salePrice || product.regularPrice;

    const cartItem = {
        productId: itemData.productId,
        variantId: itemData.variantId,
        size: itemData.size,
        color: itemData.color,
        quantity: requestedQty,
        price: price   
    };

    let cart = await cartRepo.findCartByUserId(userId);

    if (!cart) {
        if (requestedQty > sizeDetails.stock) {
            throw new Error(`Only ${sizeDetails.stock} units left in stock.`);
        }
        await cartRepo.createCart({
            userId,
            items: [cartItem]
        });
        return await cartRepo.findCartByUserId(userId);
    }

    const getProductIdString = (item) => {
        if (!item.productId) return '';
        return item.productId._id ? item.productId._id.toString() : item.productId.toString();
    };

    const existingIndex = cart.items.findIndex(item =>
        getProductIdString(item) === itemData.productId &&
        item.size === itemData.size &&
        item.color === itemData.color
    );

    if (existingIndex > -1) {
        const currentQtyInCart = cart.items[existingIndex].quantity;
        const combinedQty = currentQtyInCart + requestedQty;

        if (combinedQty > 5) {
            throw new Error(`You already have ${currentQtyInCart} in your cart. You can only add ${5 - currentQtyInCart} more.`);
        }


        if (combinedQty > sizeDetails.stock) {
            throw new Error(`Only ${sizeDetails.stock} total units are available in stock, and you already have ${currentQtyInCart} in your cart.`);
        }

        cart.items[existingIndex].quantity = combinedQty;
    } else {
        if (requestedQty > sizeDetails.stock) {
            throw new Error(`Only ${sizeDetails.stock} units left in stock.`);
        }
        cart.items.push(cartItem);
    }

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

    const getProductIdString = (item) => {
        if (!item.productId) return '';
        return item.productId._id ? item.productId._id.toString() : item.productId.toString();
    };

    const item = cart.items.find(i =>
        getProductIdString(i) === data.productId &&
        i.size === data.size &&
        i.color === data.color
    );

    if (!item) {
        throw new Error("Cart item not found");
    }

    const quantity = Number(data.targetQuantity);

    if (quantity < 1 || quantity > 5) {
        throw new Error("Quantity must be between 1 and 5");
    }

    const product = await productRepo.findProductById(data.productId);
    if (product) {
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (variant) {
            const sizeDetails = variant.sizes.find(s => s.size.toString() === item.size.toString());
            if (sizeDetails && quantity > sizeDetails.stock) {
                throw new Error(`Only ${sizeDetails.stock} items are available in stock.`);
            }
        }
    }

    item.quantity = quantity;

    await cartRepo.updateCart(userId, {
        items: cart.items
    });

    let totalUnitsCount = 0;
    let subtotal = 0;

    cart.items.forEach(item => {
        subtotal += item.price * item.quantity;
        totalUnitsCount += item.quantity;
    });

    const taxEstimate = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + taxEstimate;
   
    return {
        subtotal,
        taxEstimate,
        totalAmount,
        totalUnitsCount
    };
};

export const removeFromCart = async (userId, itemData) => {
    const cart = await cartRepo.findCartByUserId(userId);
    if (!cart) return { totalUnitsCount: 0 };

    const getProductIdString = (item) => {
        if (!item.productId) return '';
        return item.productId._id ? item.productId._id.toString() : item.productId.toString();
    };

    cart.items = cart.items.filter(item =>
        !(
            getProductIdString(item) === itemData.productId &&
            item.size === itemData.size &&
            item.color === itemData.color
        )
    );

    await cartRepo.updateCart(userId, {
        items: cart.items
    });

    let totalUnitsCount = 0;
    let subtotal = 0;

    cart.items.forEach(item => {
        subtotal += item.price * item.quantity;
        totalUnitsCount += item.quantity;
    });

    const taxEstimate = Math.floor(subtotal * 0.1);
    const totalAmount = subtotal + taxEstimate;

    return {
        success: true,
        subtotal,
        taxEstimate,
        totalAmount,
        totalUnitsCount
    };
};