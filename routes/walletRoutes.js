import express from 'express';
import { getWallet,addMoneyToWallet } from '../controllers/walletController.js';

const router=express();

router.get('/wallet',getWallet);
router.post('wallet/add-money', addMoneyToWallet);

export default router;