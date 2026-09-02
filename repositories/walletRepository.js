import Wallet from '../models/walletModel.js';
import mongoose from 'mongoose';


export const findByUserId = async (userId) => {
    return await Wallet.findOne({ user_id: userId });
};


export const createWallet = async (userId) => {
    return await Wallet.create({
        user_id: userId, 
        balance: 0,
        transactions: []
    });
};


export const updateWallet = async (userId, amount, type, description, orderId = null) => {
    const update = {
        $inc: { balance: type === 'credit' ? amount : -amount },
        $push: { 
            transactions: { 
                orderId, amount, type, description, date: new Date() 
            } 
        }
    };
    return await Wallet.findOneAndUpdate(
        { user_id: new mongoose.Types.ObjectId(userId) }, 
        update, 
        { new: true, upsert: true }
    );
};


export const findAndUpdateWalletBalance = async (userId, amount, orderId) => {
    const objectId = new mongoose.Types.ObjectId(userId);
    
    const desc = orderId ? `Order Payment for #${orderId}` : `Order Payment`;
    const wallet = await Wallet.findOneAndUpdate(
        { 
            user_id: objectId, 
            balance: { $gte: amount } 
        },
        { 
            $inc: { balance: -amount },
            $push: { 
                transactions: { 
                    orderId: orderId, 
                    amount: amount, 
                    type: 'debit', 
                    description: desc, 
                    date: new Date() 
                } 
            }
        },
        { new: true }
    );

    if (!wallet) {
        throw new Error("INSUFFICIENT_BALANCE_OR_WALLET_NOT_FOUND");
    }

    return wallet;
};