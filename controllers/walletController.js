import * as WalletService from '../services/walletService.js';
import { HTTP_STATUS } from '../constants/httpStatusCode.js';

export const getWallet = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/user/login');
        }

        const userId = req.session.user.id;
        
        const data = await WalletService.getWalletPageData(userId);

        res.render('user/wallet', { 
            wallet: data.wallet,
            user: data.user, 
            activePage: 'wallet',
            RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error loading wallet:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};


export const addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user.id;
        await WalletService.addFunds(userId, parseFloat(amount), 'Add Money');
        res.status(HTTP_STATUS.OK).json({ success: true });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};