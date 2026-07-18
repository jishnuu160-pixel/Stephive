import mongoose from 'mongoose';
import * as WalletRepo from '../repositories/walletRepository.js';
import * as UserRepo from '../repositories/userRepository.js'; 

export const getWalletDetails = async (userId) => {
    const objectId = new mongoose.Types.ObjectId(userId);
    
    let wallet = await WalletRepo.findByUserId(objectId);
    
    if (!wallet) {
        wallet = await WalletRepo.createWallet(objectId);
    }
    
    if (wallet.transactions && wallet.transactions.length > 0) {
        wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return wallet;
};


export const deductFromWallet = async (userId, amount, orderId) => {
    return await WalletRepo.findAndUpdateWalletBalance(userId, amount, orderId);
};

export const addFunds = async (userId, amount, description) => {
    if (amount <= 0) throw new Error("Invalid amount");
    return await WalletRepo.updateWallet(userId, amount, 'credit', description);
};


export const updateWallet = async (userId, amount, type, description, orderId) => {
    return await WalletRepo.updateWallet(userId, amount, type, description, orderId);
};


export const getWalletPageData = async (userId) => {
    const wallet = await getWalletDetails(userId);
    
    const user = await UserRepo.findById(userId);

    return {
        wallet,
        user: {
            fullName: user?.fullName || 'User', 
            profileImage: user?.profileImage || ''
        }
    };
};