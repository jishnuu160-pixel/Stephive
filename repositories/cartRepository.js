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
    return await Cart.findOneAndUpdate(
        { userId },
        { $set: updatedData }, 
        { 
            new: true, 
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