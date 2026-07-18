import * as WalletService from '../services/walletService.js';

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
        res.status(500).send("Internal Server Error");
    }
};


export const addMoneyToWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user.id;
        await WalletService.addFunds(userId, parseFloat(amount), 'Add Money');
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};