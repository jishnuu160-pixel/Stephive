import Cart from '../models/cartModel.js';
import mongoose from 'mongoose';

export const findCartByUserId = async (userId) => {
    const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    return await Cart.findOne({ userId: id })
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
    const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    let itemsPayload = updatedData;
    
    if (Array.isArray(updatedData)) {
        itemsPayload = updatedData;
    } else if (updatedData && Array.isArray(updatedData.items)) {
        itemsPayload = updatedData.items;
    } else {
        itemsPayload = [];
    }

    const sanitizedItems = itemsPayload.filter(item => item !== null && item !== undefined);

    return await Cart.findOneAndUpdate(
        { userId: id },
        { $set: { items: sanitizedItems } }, 
        { 
            upsert: true, 
            returnDocument: 'after' 
        }
    )
    .populate({
        path: 'items.productId',
        model: 'Product'
    })
    .lean(); 
};

