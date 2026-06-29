import Cart from '../models/cartModel.js';


export const findCartByUserId = async (userId) => {

   return await Cart.findOne({ userId })
    .populate({
        path: 'items.productId',
        model: 'Product'
    })
    .lean();
};


export const createCart = async (cartData) => {  
    return await Cart.create(cartData); 
};

export const updateCart = async (userId, updatedData) => {
    return await Cart.findOneAndUpdate(
        { userId },
        updatedData,
        { new: true }
    )
    .populate({
        path: 'items.productId',
        model: 'Product'
    })
    .lean(); 
};